const mongoose = require('mongoose');
const os = require('os');
const Activity = require('../models/Activity');
const Productivity = require('../models/Productivity');

const PRODUCTIVE_CATEGORIES = new Set(['coding', 'docs', 'design', 'meeting', 'communication']);

function buildDayRange(inputDate = new Date()) {
  const start = new Date(inputDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function toObjectId(value) {
  return new mongoose.Types.ObjectId(value);
}

function buildTodaySummary(activities) {
  const categoryTotals = {};
  const appTotals = {};
  let totalActiveSeconds = 0;
  let totalIdleSeconds = 0;

  activities.forEach((activity) => {
    categoryTotals[activity.category] = (categoryTotals[activity.category] || 0) + activity.durationSeconds;
    appTotals[activity.appName] = (appTotals[activity.appName] || 0) + activity.durationSeconds;

    if (activity.category === 'idle') totalIdleSeconds += activity.durationSeconds;
    else totalActiveSeconds += activity.durationSeconds;
  });

  const totalTrackedSeconds = totalActiveSeconds + totalIdleSeconds;
  const topApps = Object.entries(appTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([appName, durationSeconds]) => ({ appName, durationSeconds }));

  return {
    totalTrackedSeconds,
    totalActiveSeconds,
    totalIdleSeconds,
    trackedAppCount: Object.keys(appTotals).length,
    eventCount: activities.length,
    topApps,
    categoryTotals,
    lastCaptureAt: activities[0]?.sessionEnd || activities[0]?.date || null,
  };
}

// @desc  Log activity (called from desktop Electron app)
// @route POST /api/activity
// @access Private
const logActivity = async (req, res) => {
  try {
    const {
      appName,
      windowTitle,
      executablePath,
      category,
      durationSeconds,
      isPrivate,
      sessionStart,
      sessionEnd,
      source,
      trackerVersion,
      platform,
      deviceName,
    } = req.body;

    if (!appName || !durationSeconds) {
      return res.status(400).json({ success: false, message: 'appName and durationSeconds are required' });
    }

    const safeDuration = Math.max(1, Math.min(12 * 60 * 60, Number(durationSeconds) || 0));
    const resolvedStart = sessionStart ? new Date(sessionStart) : new Date();
    const resolvedEnd = sessionEnd ? new Date(sessionEnd) : new Date(resolvedStart.getTime() + safeDuration * 1000);
    const isMasked = Boolean(isPrivate);

    const activity = await Activity.create({
      user: req.user._id,
      date: resolvedStart,
      sessionStart: resolvedStart,
      sessionEnd: resolvedEnd,
      appName: isMasked ? 'Private Session' : appName,
      windowTitle: isMasked ? '[Private]' : (windowTitle || ''),
      executablePath: executablePath || '',
      category: category || 'other',
      durationSeconds: safeDuration,
      isPrivate: isMasked,
      source: source || 'desktop',
      trackerVersion: trackerVersion || '',
      platform: platform || req.headers['x-client-platform'] || process.platform,
      deviceName: deviceName || os.hostname(),
    });

    recalcProductivity(req.user._id).catch(console.error);

    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('activity-update', {
        userId: req.user._id,
        userName: req.user.name,
        activity,
      });
    }

    res.status(201).json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get my activity today
// @route GET /api/activity/me
// @access Private
const getMyActivity = async (req, res) => {
  try {
    const days = Math.max(1, Math.min(30, parseInt(req.query.days, 10) || 1));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const activities = await Activity.find({
      user: req.user._id,
      date: { $gte: start, $lte: end },
    }).sort({ sessionStart: -1, date: -1 });

    const summary = buildTodaySummary(activities.filter((entry) => {
      const { start: todayStart, end: todayEnd } = buildDayRange();
      return entry.date >= todayStart && entry.date <= todayEnd;
    }));

    res.json({
      success: true,
      count: activities.length,
      activities,
      summary,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get hourly breakdown for chart
// @route GET /api/activity/hourly/:userId
// @access Private (manager)
const getHourlyBreakdown = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    const result = await Activity.aggregate([
      { $match: { user: toObjectId(userId), date: { $gte: start, $lte: end } } },
      { $group: { _id: { hour: '$hour', category: '$category' }, totalSeconds: { $sum: '$durationSeconds' } } },
      { $sort: { '_id.hour': 1 } },
    ]);

    res.json({ success: true, breakdown: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get team activity (manager only)
// @route GET /api/activity/team
// @access Private (manager/admin)
const getTeamActivity = async (req, res) => {
  try {
    const { start } = buildDayRange();

    const result = await Activity.aggregate([
      { $match: { date: { $gte: start } } },
      {
        $group: {
          _id: '$user',
          totalSeconds: { $sum: '$durationSeconds' },
          activeSeconds: {
            $sum: {
              $cond: [{ $eq: ['$category', 'idle'] }, 0, '$durationSeconds'],
            },
          },
          idleSeconds: {
            $sum: {
              $cond: [{ $eq: ['$category', 'idle'] }, '$durationSeconds', 0],
            },
          },
          apps: { $push: { appName: '$appName', durationSeconds: '$durationSeconds' } },
          lastSeenAt: { $max: '$sessionEnd' },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          'user.password': 0,
        },
      },
    ]);

    const team = result.map((entry) => {
      const topApp = entry.apps
        .sort((a, b) => b.durationSeconds - a.durationSeconds)[0]?.appName || 'No activity';

      return {
        ...entry,
        topApp,
      };
    });

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Internal: recalculate productivity score for today
async function recalcProductivity(userId) {
  const { start, end } = buildDayRange();

  const activities = await Activity.find({
    user: userId,
    date: { $gte: start, $lte: end },
    isPrivate: false,
  });

  const totalActive = activities
    .filter((activity) => activity.category !== 'idle')
    .reduce((sum, activity) => sum + activity.durationSeconds, 0);
  const totalIdle = activities
    .filter((activity) => activity.category === 'idle')
    .reduce((sum, activity) => sum + activity.durationSeconds, 0);
  const totalAll = totalActive + totalIdle;

  const score = totalAll > 0 ? Math.min(100, Math.round((totalActive / totalAll) * 100)) : 0;

  const appMap = {};
  activities.forEach((activity) => {
    appMap[activity.appName] = (appMap[activity.appName] || 0) + activity.durationSeconds;
  });

  const topApps = Object.entries(appMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([appName, durationSeconds]) => ({ appName, durationSeconds }));

  const focusedSeconds = activities
    .filter((activity) => PRODUCTIVE_CATEGORIES.has(activity.category))
    .reduce((sum, activity) => sum + activity.durationSeconds, 0);
  const focusScore = totalActive > 0 ? Math.round((focusedSeconds / totalActive) * 100) : 0;

  const burnoutRisk = totalActive > 36000 ? 'high' : totalActive > 25200 ? 'medium' : 'low';
  const anomalyFlag = totalIdle > totalActive && totalAll > 3600;
  const anomalyReason = anomalyFlag ? 'Idle time exceeded active time for more than one tracked hour.' : '';

  await Productivity.findOneAndUpdate(
    { user: userId, date: start },
    {
      score,
      totalActiveSeconds: totalActive,
      totalIdleSeconds: totalIdle,
      focusScore,
      burnoutRisk,
      anomalyFlag,
      anomalyReason,
      topApps,
    },
    { upsert: true, new: true }
  );
}

module.exports = { logActivity, getMyActivity, getHourlyBreakdown, getTeamActivity };
