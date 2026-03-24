const Productivity = require('../models/Productivity');
const Activity = require('../models/Activity');
const User = require('../models/User');

// @desc  Get my productivity (last 7 days)
// @route GET /api/analytics/me
// @access Private
const getMyProductivity = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const records = await Productivity.find({ user: req.user._id, date: { $gte: from } }).sort({ date: 1 });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get team productivity overview (manager)
// @route GET /api/analytics/team
// @access Private (manager/admin)
const getTeamProductivity = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const records = await Productivity.find({ date: today })
      .populate('user', 'name email role department avatar');

    // Burnout alerts
    const burnoutAlerts = await Productivity.find({ burnoutRisk: { $in: ['medium', 'high'] } })
      .populate('user', 'name email')
      .sort({ date: -1 })
      .limit(10);

    // Anomaly flags
    const anomalies = await Productivity.find({ anomalyFlag: true })
      .populate('user', 'name email')
      .sort({ date: -1 })
      .limit(10);

    res.json({ success: true, records, burnoutAlerts, anomalies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get weekly heatmap data
// @route GET /api/analytics/heatmap/:userId
// @access Private
const getHeatmap = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const from = new Date(); from.setDate(from.getDate() - 7);

    const result = await Activity.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          date: { $gte: from },
          isPrivate: false,
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$date' },
            hour: '$hour',
          },
          totalSeconds: { $sum: '$durationSeconds' },
        },
      },
    ]);

    res.json({ success: true, heatmap: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all users summary (admin/manager)
// @route GET /api/analytics/summary
// @access Private (manager/admin)
const getTeamSummary = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('name email role department');
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const productivity = await Productivity.find({ date: today });
    const prodMap = {};
    productivity.forEach(p => { prodMap[p.user.toString()] = p; });

    const summary = users.map(u => ({
      user: u,
      productivity: prodMap[u._id.toString()] || null,
    }));

    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getMyProductivity, getTeamProductivity, getHeatmap, getTeamSummary };
