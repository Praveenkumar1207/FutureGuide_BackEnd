const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Chat routes
router.post('/', chatController.createSmartChat);
router.get('/', chatController.getAllChats);

// Specific routes must come before generic routes with params
router.get('/stats', chatController.getChatStats);
router.get('/profile/:id', chatController.getchatByProfileId);
router.post('/messages', chatController.sendMessageToChat);

// DELETE all route should come before parameterized DELETE
router.delete('/', chatController.deleteAllChats);

// Generic ID routes come after more specific routes
router.get('/:id', chatController.getChatById);
router.put('/:id', chatController.updateChatName);
router.delete('/:id', chatController.deleteChat);

module.exports = router;
