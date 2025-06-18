const mongoose = require('mongoose');

const goalsSchema = new mongoose.Schema({
  primary: { type: String, required: true },
  secondary: { type: String }
}, { _id: false });

const progressSchema = new mongoose.Schema({
  completedMilestones: { type: Number, default: 0 },
  totalMilestones: { type: Number, default: 0 },
  percentageComplete: { type: Number, default: 0 }
}, { _id: false });

const milestoneSchema = new mongoose.Schema({
  id: Number,
  date: String,
  title: String,
  completed: { type: Boolean, default: false }
}, { _id: false });

const roadmapSchema = new mongoose.Schema({
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // login_id: { // <-- add this field
  //   type: String,
  //   required: false,
  //   index: true
  // },
  title: { type: String, required: true },
  careerInterest: { type: String, required: true },
  goals: { type: goalsSchema, required: true },
  duration: { type: Number, required: true }, // <-- new field (in days)
  generatedContent: { type: Object, default: {} },
  milestones: { type: [milestoneSchema], default: [] },
  progress: { type: progressSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Roadmap', roadmapSchema);
module.exports = mongoose.model('Roadmap', roadmapSchema);
