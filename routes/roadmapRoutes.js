const express = require('express');
const router = express.Router();
const roadmapController = require('../controllers/roadmapController');

router.post('/generate', roadmapController.createRoadmap);
router.get('/all', roadmapController.getAllRoadmaps);

module.exports = router;
