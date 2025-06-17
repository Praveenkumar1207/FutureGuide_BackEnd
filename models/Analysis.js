const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jobDescription: {
    type: String,
    required: true,
  },
  resumeText: {
    type: String,
    default: '', // Optional, can be blank
  },
  linkedinText: {
    type: String,
    default: '', // Optional, can be blank
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: null, // Score can be null initially
  },
  reasoning: {
    type: String,
    default: '', // Optional field explaining score
  },
  suggestions: {
    type: [String],
    default: [], // Suggestions to improve match
  },
  analysisType: {
    type: String,
    enum: ['resume', 'linkedin', 'both'],
    default: 'both', // Helps differentiate type of analysis
  },
  analysisMetadata: {
    type: Object,
    default: {} 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Analysis', analysisSchema);