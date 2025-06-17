const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController'); // FIX: Correct path to controller

// Existing routes
router.post('/createChat', chatController.createSmartChat);        // Gemini chatName + 1st answer
router.post('/sendMessageToChat', chatController.sendMessageToChat)  // Add question + answer
router.get('/getChatByProfile/:profileId', chatController.getchatByProfileId); // Get chat by name
router.get('/getAllChats', chatController.getAllChats)                 // All chats
router.get('/getChatById/:chatId', chatController.getChatById)        // One chat
router.put('/updateChatName/:chatId', chatController.updateChatName)    // Manual rename
router.delete('/deleteChat/:chatId', chatController.deleteChat)      // Delete one
router.delete('/deleteAllChats', chatController.deleteAllChats)         // Delete all
router.get('/getChatStats', chatController.getChatStats)          // Stats

module.exports = router;
