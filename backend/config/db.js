const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Hardcoded MongoDB connection for now
    const mongoURI = 'mongodb://localhost:27017/workpulse';
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;