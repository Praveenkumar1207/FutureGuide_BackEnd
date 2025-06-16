const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    questions: [{
        type: Map,
        of: String
    }],
}, {
    timestamps: true
});

module.exports = mongoose.model('Chat', chatSchema);
