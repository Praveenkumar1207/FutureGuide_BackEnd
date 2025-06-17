const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  chatName: {
    type: String,
    required: true,
    trim: true,
  },
  messages: [
    {
      question: String,
      answer: String,
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
