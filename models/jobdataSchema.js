const e = require('express');
const mongoose = require('mongoose');

const jobDataSchema = new mongoose.Schema({
    jobTitle: {
        type: String,
        required: true,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        // required: true,
        trim: true
    },
    jobDescription: {
        type: String,
        required: true,
        trim: true
    },
    jobType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
        // required: true
    },
    salaryRange: {
        type: String,
        // required: true,
        trim: true
    },
    requirements: {
        type: [String],
        // required: true
    },
    benefits: {
        type: [String],
        required: false
    },
    postedDate: {
        type: Date,
        default: Date.now
    },
    applicationDeadline: {
        type: Date,
        required: true
    },
    expirationDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    contactEmail: {
        type: String,
        // required: true,
        trim: true,
        match: /.+\@.+\..+/
    },
    contactPhone: {
        type: String,
        required: false,
        trim: true
    },
    applicationlink: {
        type: String,
        required: false,
        trim: true,
        match: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/
    },
})

module.exports = mongoose.model('JobData', jobDataSchema);