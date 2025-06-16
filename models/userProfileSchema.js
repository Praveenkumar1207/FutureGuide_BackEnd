const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    nickname: {
        type: String,
        trim: true,
        required: false,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true,
    },
    college: {
        type: String,
        required: true,
    },
    branch: {
        type: String,
        required: true,
    },
    year: {
        type: String,
        required: true,
    },
    course: {
        type: String,
        required: true,
    },
    specialization: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true,
        unique: true,
    },
    Profile_image_path: {
        type: String,
        required: true,
    },
    Resume_path: {
        type: String,
    },
    primary_goal: {
        type: String,
    },
    secondary_goal: {
        type: String,
    },
    skill: {
        type: [String],
        default: [],
    },
    linkedin_url: {
        type: String,
    },
    login_id: {
        type: String,
        required: false,
        unique: true,
    },
}, {
    timestamps: true
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

module.exports = UserProfile;
