const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
  estimatedHours: { type: Number, default: 0 },
  loggedHours: { type: Number, default: 0 },
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tasks: [taskSchema],
  status: { type: String, enum: ['active', 'completed', 'onhold'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Virtual: completion %
projectSchema.virtual('completionPercent').get(function () {
  if (!this.tasks.length) return 0;
  const done = this.tasks.filter(t => t.status === 'done').length;
  return Math.round((done / this.tasks.length) * 100);
});

projectSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);
