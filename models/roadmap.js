const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  id: Number,
  date: String,
  title: String,
  completed: { type: Boolean, default: false }
}, { _id: false });

const roadmapSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '' },
  iconSet: { type: String, default: '' },
  initialMilestones: [milestoneSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Roadmap', roadmapSchema);
