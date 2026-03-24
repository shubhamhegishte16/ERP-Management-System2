require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http'); // ADDED for Socket.io
const socketio = require('socket.io'); // ADDED for real-time
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app); // ADDED - create HTTP server
const io = socketio(server, { // ADDED - Socket.io setup
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Make io accessible to routes (ADDED)
app.set('io', io);

// ── Middleware ────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api', limiter);

// ── Routes ────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/activity',  require('./routes/activity'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/admin',     require('./routes/admin')); // ADDED - Admin dashboard routes

// ── Socket.io Real-time Connection (ADDED) ─────────────────
io.on('connection', (socket) => {
  console.log('📡 New client connected:', socket.id);
  
  // Admin joins admin room for real-time updates
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👑 Admin joined admin-room');
  });
  
  // Employee activity updates (for real-time monitoring)
  socket.on('new-activity', async (activityData) => {
    // Broadcast to all admins in real-time
    io.to('admin-room').emit('activity-update', activityData);
  });
  
  // Project updates
  socket.on('project-update', (projectData) => {
    io.to('admin-room').emit('project-changed', projectData);
  });
  
  socket.on('disconnect', () => {
    console.log('📡 Client disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 WorkPulse server running on http://localhost:${PORT}`));