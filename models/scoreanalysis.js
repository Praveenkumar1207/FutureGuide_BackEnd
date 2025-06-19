const mongoose = require('mongoose');

const scoreAnalysiSchema = new mongoose.Schema({
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserProfile',
        required: true
    },
    jobDescriptionPDF: {
        type: String,
        required: true
    },
    resumePDF: {
        type: String
    },
    linkedinPDF: {
        type: String
    },
    score: {
        type: Number,
        min: 0,
        max: 100
    },
    suggestions: {
        type: [String] 
    },
    analysis: {
        type: [String]
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ScoreAnalysis', scoreAnalysiSchema);
