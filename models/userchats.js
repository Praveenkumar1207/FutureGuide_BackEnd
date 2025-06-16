const mongoose = require('mongoose');

const userChatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    chats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat'  // explicitly reference the Chat schema
    }],
}, {
    timestamps: true
});

module.exports = mongoose.model('UserChat', userChatSchema);
