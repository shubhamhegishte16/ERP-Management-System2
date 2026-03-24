const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const Productivity = require('../models/Productivity');

const MONGO_URI = 'mongodb://localhost:27017/workpulse';

const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected for seeding...');
};

const seed = async () => {
  await connectDB();

  // Clear existing data
  await Promise.all([User.deleteMany(), Project.deleteMany(), Activity.deleteMany(), Productivity.deleteMany()]);
  console.log('🗑️ Cleared existing data');

  // Hash password function
  const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
  };

  const hashedPassword = await hashPassword('password123');

  // ========== CREATE ADMIN ==========
  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@workpulse.com',
    password: hashedPassword,
    role: 'admin',
    department: 'Administration',
    isActive: true
  });
  console.log('✅ Admin created: Super Admin (admin@workpulse.com)');

  // ========== CREATE MANAGERS ==========
  const engManager = await User.create({
    name: 'Arjun Sharma',
    email: 'arjun.manager@workpulse.com',
    password: hashedPassword,
    role: 'manager',
    department: 'Engineering',
    isActive: true
  });
  console.log('✅ Manager created: Arjun Sharma (Engineering)');

  const marketingManager = await User.create({
    name: 'Priya Kapoor',
    email: 'priya.manager@workpulse.com',
    password: hashedPassword,
    role: 'manager',
    department: 'Marketing',
    isActive: true
  });
  console.log('✅ Manager created: Priya Kapoor (Marketing)');

  // ========== CREATE ENGINEERING TEAM ==========
  const engEmployees = [
    { name: 'Rahul Mehta', email: 'rahul@workpulse.com', department: 'Engineering', role: 'employee' },
    { name: 'Neha Gupta', email: 'neha@workpulse.com', department: 'Engineering', role: 'employee' },
    { name: 'Vikram Singh', email: 'vikram@workpulse.com', department: 'Engineering', role: 'employee' }
  ];

  const engineeringTeam = [];
  for (const emp of engEmployees) {
    const user = await User.create({
      ...emp,
      password: hashedPassword,
      isActive: true
    });
    engineeringTeam.push(user);
    console.log(`✅ Employee created: ${emp.name} (${emp.department})`);
  }

  // ========== CREATE MARKETING TEAM ==========
  const marketingEmployees = [
    { name: 'Sarah Khan', email: 'sarah@workpulse.com', department: 'Marketing', role: 'employee' },
    { name: 'Anjali Verma', email: 'anjali@workpulse.com', department: 'Marketing', role: 'employee' },
    { name: 'Rohan Das', email: 'rohan@workpulse.com', department: 'Marketing', role: 'employee' }
  ];

  const marketingTeam = [];
  for (const emp of marketingEmployees) {
    const user = await User.create({
      ...emp,
      password: hashedPassword,
      isActive: true
    });
    marketingTeam.push(user);
    console.log(`✅ Employee created: ${emp.name} (${emp.department})`);
  }

  // ========== CREATE PROJECTS ==========
  // Engineering Project
  await Project.create({
    name: 'WorkPulse Dashboard',
    description: 'Build real-time analytics dashboard',
    manager: engManager._id,
    team: engineeringTeam.map(emp => emp._id),
    status: 'active',
    startDate: new Date('2024-03-01'),
    tasks: [
      { title: 'Design UI Components', assignedTo: engineeringTeam[0]._id, status: 'done', estimatedHours: 20, loggedHours: 18 },
      { title: 'Backend API Development', assignedTo: engineeringTeam[1]._id, status: 'inprogress', estimatedHours: 40, loggedHours: 25 },
      { title: 'Database Schema Design', assignedTo: engineeringTeam[2]._id, status: 'done', estimatedHours: 15, loggedHours: 14 },
      { title: 'Real-time Socket Integration', assignedTo: engineeringTeam[0]._id, status: 'inprogress', estimatedHours: 25, loggedHours: 10 },
      { title: 'Testing & QA', assignedTo: engineeringTeam[1]._id, status: 'todo', estimatedHours: 15, loggedHours: 0 }
    ]
  });
  console.log('✅ Project created: WorkPulse Dashboard (Engineering)');

  // Marketing Project
  await Project.create({
    name: 'Product Launch Campaign',
    description: 'Q2 2024 Marketing Campaign',
    manager: marketingManager._id,
    team: marketingTeam.map(emp => emp._id),
    status: 'active',
    startDate: new Date('2024-03-10'),
    tasks: [
      { title: 'Market Research', assignedTo: marketingTeam[0]._id, status: 'done', estimatedHours: 30, loggedHours: 28 },
      { title: 'Content Creation', assignedTo: marketingTeam[1]._id, status: 'inprogress', estimatedHours: 25, loggedHours: 15 },
      { title: 'Social Media Strategy', assignedTo: marketingTeam[2]._id, status: 'done', estimatedHours: 20, loggedHours: 22 },
      { title: 'Email Campaign', assignedTo: marketingTeam[0]._id, status: 'todo', estimatedHours: 15, loggedHours: 0 }
    ]
  });
  console.log('✅ Project created: Product Launch Campaign (Marketing)');

  // ========== GENERATE ACTIVITIES & PRODUCTIVITY ==========
  const allUsers = [admin, engManager, marketingManager, ...engineeringTeam, ...marketingTeam];
  
  const apps = [
    { appName: 'VS Code', category: 'coding', duration: 3600 },
    { appName: 'Chrome', category: 'browsing', duration: 1800 },
    { appName: 'Slack', category: 'communication', duration: 1200 },
    { appName: 'Figma', category: 'design', duration: 2400 },
    { appName: 'Notion', category: 'docs', duration: 1500 },
    { appName: 'Zoom', category: 'meeting', duration: 1800 }
  ];

  // Generate data for last 7 days
  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);
      
      // Activities for each day
      const numActivities = Math.floor(Math.random() * 15) + 5;
      for (let a = 0; a < numActivities; a++) {
        const randomApp = apps[Math.floor(Math.random() * apps.length)];
        const hour = Math.floor(Math.random() * 24);
        const activityDate = new Date(date);
        activityDate.setHours(hour, Math.floor(Math.random() * 60), 0);
        
        await Activity.create({
          user: user._id,
          date: activityDate,
          appName: randomApp.appName,
          windowTitle: `${randomApp.appName} - WorkPulse`,
          category: randomApp.category,
          durationSeconds: randomApp.duration,
          hour: hour
        });
      }
      
      // Productivity score based on role and department
      let baseScore = 0;
      if (user.role === 'admin') baseScore = 85;
      else if (user.role === 'manager') baseScore = 75;
      else if (user.department === 'Engineering') baseScore = 65 + Math.random() * 25;
      else baseScore = 60 + Math.random() * 30;
      
      const score = Math.min(100, Math.max(0, baseScore + (Math.random() * 20 - 10)));
      const focusScore = Math.min(100, score - 10 + Math.random() * 20);
      
      // Determine burnout risk
      let burnoutRisk = 'low';
      if (score < 50) burnoutRisk = 'high';
      else if (score < 70) burnoutRisk = 'medium';
      
      await Productivity.create({
        user: user._id,
        date: date,
        score: Math.floor(score),
        totalActiveSeconds: 20000 + Math.random() * 20000,
        totalIdleSeconds: 2000 + Math.random() * 5000,
        focusScore: Math.floor(focusScore),
        burnoutRisk: burnoutRisk,
        anomalyFlag: score < 40,
        anomalyReason: score < 40 ? 'Unusually low productivity detected' : '',
        topApps: apps.slice(0, 3).map(app => ({ appName: app.appName, durationSeconds: app.duration }))
      });
    }
    
    // Special: Make some employees at-risk
    if (user.name === 'Rahul Mehta') {
      await Productivity.updateMany(
        { user: user._id },
        { score: 35, burnoutRisk: 'high', anomalyFlag: true, anomalyReason: 'Consistently low productivity' }
      );
    }
    
    if (user.name === 'Sarah Khan') {
      await Productivity.updateMany(
        { user: user._id },
        { score: 42, burnoutRisk: 'medium' }
      );
    }
    
    console.log(`✅ Data generated for: ${user.name}`);
  }

  console.log('\n🎉 ========== SEED COMPLETE! ==========\n');
  console.log('📋 LOGIN CREDENTIALS:\n');
  console.log('👑 ADMIN (Full Access):');
  console.log('   Email: admin@workpulse.com');
  console.log('   Password: password123\n');
  
  console.log('📋 MANAGERS (Department Only):');
  console.log(`   Engineering: arjun.manager@workpulse.com / password123`);
  console.log(`   Marketing: priya.manager@workpulse.com / password123\n`);
  
  console.log('👥 EMPLOYEES (Personal Only):');
  console.log('   ENGINEERING TEAM:');
  console.log('   → Rahul Mehta: rahul@workpulse.com / password123 (⚠️ At-Risk)');
  console.log('   → Neha Gupta: neha@workpulse.com / password123');
  console.log('   → Vikram Singh: vikram@workpulse.com / password123\n');
  console.log('   MARKETING TEAM:');
  console.log('   → Sarah Khan: sarah@workpulse.com / password123 (⚠️ At-Risk)');
  console.log('   → Anjali Verma: anjali@workpulse.com / password123');
  console.log('   → Rohan Das: rohan@workpulse.com / password123\n');
  
  console.log('📊 ACCESS RULES:');
  console.log('   • Admin → Can see ALL users, projects, activities');
  console.log('   • Manager → Can see ONLY their department team');
  console.log('   • Employee → Can see ONLY their own data\n');
  
  process.exit(0);
};

seed().catch(err => { 
  console.error('❌ Seeding error:', err); 
  process.exit(1); 
});