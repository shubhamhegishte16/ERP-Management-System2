require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const Productivity = require('../models/Productivity');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected for seeding...');
};

const seed = async () => {
  await connectDB();

  // Clear existing data
  await Promise.all([User.deleteMany(), Project.deleteMany(), Activity.deleteMany(), Productivity.deleteMany()]);
  console.log('Cleared existing data');

  // Create users
  const manager = await User.create({ name: 'Arjun Sharma', email: 'manager@workpulse.com', password: 'password123', role: 'manager', department: 'Engineering' });
  const emp1 = await User.create({ name: 'Sarah Khan', email: 'sarah@workpulse.com', password: 'password123', role: 'employee', department: 'Frontend' });
  const emp2 = await User.create({ name: 'Rahul Mehta', email: 'rahul@workpulse.com', password: 'password123', role: 'employee', department: 'Backend' });
  const emp3 = await User.create({ name: 'Priya Nair', email: 'priya@workpulse.com', password: 'password123', role: 'employee', department: 'Product' });
  console.log('Users created');

  // Create project
  await Project.create({
    name: 'WorkPulse MVP',
    description: 'Build the core product for launch',
    manager: manager._id,
    team: [emp1._id, emp2._id, emp3._id],
    status: 'active',
    tasks: [
      { title: 'Design login page', assignedTo: emp1._id, status: 'done', estimatedHours: 4, loggedHours: 3.5 },
      { title: 'Build REST API', assignedTo: emp2._id, status: 'inprogress', estimatedHours: 10, loggedHours: 6 },
      { title: 'Write product spec', assignedTo: emp3._id, status: 'done', estimatedHours: 3, loggedHours: 2.5 },
      { title: 'Dashboard components', assignedTo: emp1._id, status: 'inprogress', estimatedHours: 8, loggedHours: 4 },
    ],
  });
  console.log('Project created');

  // Seed activity logs for today
  const apps = [
    { appName: 'VS Code', category: 'coding', duration: 3600 },
    { appName: 'Chrome', category: 'browsing', duration: 1800 },
    { appName: 'Slack', category: 'communication', duration: 900 },
    { appName: 'Notion', category: 'docs', duration: 1200 },
    { appName: 'Idle', category: 'idle', duration: 600 },
  ];

  for (const emp of [emp1, emp2, emp3]) {
    for (const a of apps) {
      await Activity.create({ user: emp._id, appName: a.appName, category: a.category, durationSeconds: a.duration });
    }
    await Productivity.create({
      user: emp._id,
      date: new Date().setHours(0, 0, 0, 0),
      score: Math.floor(60 + Math.random() * 35),
      totalActiveSeconds: 7500,
      totalIdleSeconds: 600,
      burnoutRisk: emp._id.equals(emp1._id) ? 'high' : 'low',
      anomalyFlag: emp._id.equals(emp2._id),
      anomalyReason: emp._id.equals(emp2._id) ? 'Coding time 70% below average' : '',
      topApps: apps.slice(0, 3).map(a => ({ appName: a.appName, durationSeconds: a.duration })),
    });
  }
  console.log('Activities & productivity seeded');

  console.log('\n✅ Seed complete! Login credentials:');
  console.log('  Manager: manager@workpulse.com / password123');
  console.log('  Employee: sarah@workpulse.com / password123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
