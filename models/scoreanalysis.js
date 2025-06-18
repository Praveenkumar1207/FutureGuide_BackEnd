const mongoose = require('mongoose');

const scoreAnalysisSchema = new mongoose.Schema({
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Changed from 'Profile' to 'User'
        required: true
    },
    jobDescription: {
        type: String,
        required: true
    },
    resumeText: {
        type: String,
        default: '' // Optional, can be blank
    },
    linkedinText: {
        type: String,
        default: '' // Optional, can be blank
    },
    score: {
        type: Number,
        min: 0,
        max: 100,
        required: true // Made required since analysis always returns a score
    },
    reasoning: {
        type: String,
        required: true // Made required for better analysis tracking
    },
    suggestions: {
        type: [String],
        default: [], // Suggestions to improve match
        validate: {
            validator: function(v) {
                return v.length <= 5; // Ensure max 5 suggestions
            },
            message: 'Maximum 5 suggestions allowed'
        }
    },  
    analysisType: {
        type: String,
        enum: ['resume', 'linkedin', 'both'],
        default: 'resume' // Default to resume since it has priority
    },
    // Additional metadata
    documentSource: {
        type: String,
        enum: ['profile', 'upload'],
        default: 'profile' // Track if documents came from profile or new upload
    },
    // Store Cloudinary URLs for reference (optional)
    cloudinaryUrls: {
        jobDescription: String,
        resume: String,
        linkedin: String
    }
}, {
    timestamps: true // This adds createdAt and updatedAt automatically
});

// Add indexes for better query performance
scoreAnalysisSchema.index({ profileId: 1, createdAt: -1 });
scoreAnalysisSchema.index({ profileId: 1, score: -1 });

// Add a method to get formatted analysis data
scoreAnalysisSchema.methods.getFormattedData = function() {
    return {
        id: this._id,
        score: this.score,
        reasoning: this.reasoning,
        suggestions: this.suggestions,
        analysisType: this.analysisType,
        documentSource: this.documentSource,
        analysisDate: this.createdAt,
        lastUpdated: this.updatedAt
    };
};

// Static method to get user's best score
scoreAnalysisSchema.statics.getBestScore = function(profileId) {
    return this.findOne({ profileId })
        .sort({ score: -1 })
        .select('score reasoning analysisType createdAt');
};

// Static method to get user's recent analyses
scoreAnalysisSchema.statics.getRecentAnalyses = function(profileId, limit = 5) {
    return this.find({ profileId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('score reasoning suggestions analysisType createdAt');
};

module.exports = mongoose.model('ScoreAnalysis', scoreAnalysisSchema);