const mongoose = require('mongoose');

const scoreAnalysisSchema = new mongoose.Schema({
    userid :{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
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
        default: null // Score can be null initially
    },
    reasoning: {
        type: String,
        default: '' // Optional field explaining score
    },
    suggestions: {
        type: [String],
        default: [] // Suggestions to improve match
    },  
    analysisType: {
        type: String,
        enum: ['resume', 'linkedin', 'both'],
        default: 'both' // Helps differentiate type of analysis
    },
});
scoreAnalysisSchema.set('timestamps', true);
module.exports = mongoose.model('ScoreAnalysis', scoreAnalysisSchema);


// This schema is used to store the analysis of job applications against job descriptions,
// including scores, reasoning, and suggestions for improvement.
// It allows for analysis of resumes, LinkedIn profiles, or both, and is linked to a user profile.
// The schema includes fields for job description, resume text, LinkedIn text, score, reasoning, suggestions, and analysis type.
// The timestamps option automatically adds createdAt and updatedAt fields to the schema.
// The score is a number between 0 and 100, with default value null.
// The reasoning field is a string that explains the score, and suggestions is an array of strings for improvement.
// The analysisType field indicates whether the analysis is based on a resume, LinkedIn profile, or both.