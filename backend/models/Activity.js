const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  sessionStart: { type: Date, default: Date.now },
  sessionEnd: { type: Date, default: Date.now },
  appName: { type: String, required: true },
  windowTitle: { type: String, default: '' },
  executablePath: { type: String, default: '' },
  category: {
    type: String,
    enum: ['coding', 'browsing', 'communication', 'design', 'docs', 'meeting', 'idle', 'other'],
    default: 'other',
  },
  durationSeconds: { type: Number, default: 0 },
  isPrivate: { type: Boolean, default: false },
  hour: { type: Number },
  source: { type: String, enum: ['desktop', 'manual'], default: 'desktop' },
  trackerVersion: { type: String, default: '' },
  platform: { type: String, default: '' },
  deviceName: { type: String, default: '' },
});

activitySchema.pre('save', function (next) {
  const anchorDate = this.sessionStart || this.date || new Date();
  this.date = anchorDate;
  this.hour = new Date(anchorDate).getHours();

  if (!this.sessionEnd) {
    this.sessionEnd = new Date(anchorDate.getTime() + (this.durationSeconds || 0) * 1000);
  }

  next();
});

activitySchema.index({ user: 1, date: -1 });
activitySchema.index({ user: 1, sessionStart: -1 });

module.exports = mongoose.model('Activity', activitySchema);
