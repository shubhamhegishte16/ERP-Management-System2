const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Project = require('../models/Project');
const Productivity = require('../models/Productivity'); // Note: Capital 'P'

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Dashboard Overview Stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all counts
    const [
      totalUsers,
      activeUsersToday,
      totalProjects,
      activeProjects,
      todayActivities,
      avgProductivityToday
    ] = await Promise.all([
      User.countDocuments(),
      Activity.distinct('user', { date: { $gte: today, $lt: tomorrow } }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Activity.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
      Productivity.aggregate([
        { $match: { date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsersToday: activeUsersToday.length,
        totalProjects,
        activeProjects,
        todayActivities,
        avgProductivity: avgProductivityToday[0]?.avgScore || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Real-time Active Users with Current Activity
router.get('/active-users', async (req, res) => {
  try {
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);
    
    const activeUsers = await Activity.aggregate([
      { $match: { date: { $gte: lastHour } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$user',
          lastActivity: { $first: '$date' },
          currentApp: { $first: '$appName' },
          category: { $first: '$category' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          name: '$userDetails.name',
          email: '$userDetails.email',
          department: '$userDetails.department',
          role: '$userDetails.role',
          lastActivity: 1,
          currentApp: 1,
          category: 1
        }
      },
      { $sort: { lastActivity: -1 } }
    ]);
    
    res.json({ success: true, data: activeUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Employee Productivity Rankings
router.get('/employee-rankings', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const rankings = await Productivity.aggregate([
      { $match: { date: { $gte: today } } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $match: { 'user.isActive': true } },
      {
        $project: {
          userId: '$user._id',
          name: '$user.name',
          email: '$user.email',
          department: '$user.department',
          role: '$user.role',
          score: 1,
          focusScore: 1,
          burnoutRisk: 1,
          totalActiveSeconds: 1
        }
      },
      { $sort: { score: -1 } },
      { $limit: 20 }
    ]);
    
    res.json({ success: true, data: rankings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Project Progress Dashboard
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('manager', 'name email')
      .populate('team', 'name email')
      .sort({ createdAt: -1 });
    
    const projectStats = projects.map(project => ({
      id: project._id,
      name: project.name,
      manager: project.manager,
      teamSize: project.team.length,
      tasks: {
        total: project.tasks.length,
        todo: project.tasks.filter(t => t.status === 'todo').length,
        inprogress: project.tasks.filter(t => t.status === 'inprogress').length,
        done: project.tasks.filter(t => t.status === 'done').length
      },
      completionPercent: project.completionPercent,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate
    }));
    
    res.json({ success: true, data: projectStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hourly Activity Heatmap
router.get('/hourly-activity', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const hourlyData = await Activity.aggregate([
      { $match: { date: { $gte: today } } },
      {
        $group: {
          _id: '$hour',
          totalActivities: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          hour: '$_id',
          totalActivities: 1,
          activeUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { hour: 1 } }
    ]);
    
    // Fill missing hours
    const filledData = [];
    for (let i = 0; i < 24; i++) {
      const existing = hourlyData.find(h => h.hour === i);
      filledData.push({
        hour: i,
        totalActivities: existing?.totalActivities || 0,
        activeUsers: existing?.activeUsers || 0
      });
    }
    
    res.json({ success: true, data: filledData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// At-Risk Employees (Low productivity or high burnout risk)
router.get('/at-risk-employees', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const atRisk = await Productivity.aggregate([
      { $match: { date: { $gte: today } } },
      {
        $match: {
          $or: [
            { score: { $lt: 40 } },
            { burnoutRisk: 'high' },
            { anomalyFlag: true }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$user._id',
          name: '$user.name',
          email: '$user.email',
          department: '$user.department',
          score: 1,
          burnoutRisk: 1,
          anomalyFlag: 1,
          anomalyReason: 1,
          focusScore: 1
        }
      }
    ]);
    
    res.json({ success: true, data: atRisk });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Admin cannot delete their own account' });
    }

    await Activity.deleteMany({ user: user._id });
    await Productivity.deleteMany({ user: user._id });
    await Project.updateMany(
      {},
      {
        $pull: {
          team: user._id,
          tasks: { assignedTo: user._id },
        },
      }
    );
    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
