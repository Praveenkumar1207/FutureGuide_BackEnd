const express = require('express');
const router = express.Router();
const roadmapController = require('../controllers/roadmapController');

// Create new roadmap
router.post('/generate', roadmapController.createRoadmap);

// Get all roadmaps (admin route)
router.get('/all', roadmapController.getAllRoadmaps);

// New routes for profile-specific operations
router.get('/profile/:profileId', roadmapController.getRoadmapsByProfileId);
router.delete('/profile/:profileId/all', roadmapController.deleteAllProfileRoadmaps);

// Routes for specific roadmap operations
router.get('/get/:id', roadmapController.getRoadmapById);
router.put('update/:id', roadmapController.updateRoadmap);
router.delete('/:id', roadmapController.deleteRoadmap);

module.exports = router;
