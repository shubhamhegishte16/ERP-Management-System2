const mongoose = require('mongoose');

const productivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  score: { type: Number, min: 0, max: 100, default: 0 },
  totalActiveSeconds: { type: Number, default: 0 },
  totalIdleSeconds: { type: Number, default: 0 },
  focusScore: { type: Number, default: 0 },       // Long uninterrupted sessions
  burnoutRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  anomalyFlag: { type: Boolean, default: false },
  anomalyReason: { type: String, default: '' },
  topApps: [{ appName: String, durationSeconds: Number }],
});

// Compound index: one record per user per day
productivitySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Productivity', productivitySchema);
