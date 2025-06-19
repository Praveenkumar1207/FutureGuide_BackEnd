const express = require('express');
const router = express.Router();
const roadmapController = require('../controllers/roadmapController');

// Create new roadmap (from frontend form)
router.post('/generate', roadmapController.createRoadmap);

// Get all roadmaps (admin route)
router.get('/all', roadmapController.getAllRoadmaps);

// Profile-specific roadmap routes
router.get('/profile/:profileId', roadmapController.getRoadmapsByProfileId);
router.delete('/profile/:profileId/all', roadmapController.deleteAllProfileRoadmaps);

// Specific roadmap operations
router.get('/get/:id', roadmapController.getRoadmapById);
router.put('/update/:id', roadmapController.updateRoadmap);
router.delete('/delete/:id', roadmapController.deleteRoadmap);

module.exports = router;
