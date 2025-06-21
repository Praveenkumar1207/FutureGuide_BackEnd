const express = require('express');
const router = express.Router();
const { scoreanalysis, uploadPDFs, getAnalysisByProfileId,
    getAnalysisById } = require('../controllers/scoreAnalysisController');

// Analysis routes
router.post('/', uploadPDFs, scoreanalysis);

// Profile-specific route must come before the generic ID route
router.get('/profile/:profileId', getAnalysisByProfileId);

// Generic ID route comes after more specific routes
router.get('/:id', getAnalysisById);

module.exports = router;
