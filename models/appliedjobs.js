const mongoose  = require('mongoose');
const appliedJobSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobData',
        required: true
    },
    jobName: {
        type: String,
        required: true,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserProfile',
        required: true
    },
    applicationDate: {
        type: Date,
        default: Date.now
    }  
}, { timestamps: true });
module.exports = mongoose.model('AppliedJob', appliedJobSchema);