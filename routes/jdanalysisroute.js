const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinaryConfig'); // Fixed: Changed 'cloudinary' to 'cloudinaryConfig'
const {
    uploadJDAndCheckProfile,
    uploadProfileDocuments,
    scoreanalysis,
    getScoreHistory,
    getProfileDocumentStatus,
    isworking
} = require('../controllers/scoreAnalysisController');

// Step 1: Upload JD and check user profile status
router.post('/upload-jd', upload.single('jobDescription'), uploadJDAndCheckProfile);
router.get('/isworking', isworking); // CHANGED: from /testing to /isworking
// Step 2: Upload Resume/LinkedIn documents (optional based on profile status)
router.post('/upload-document', upload.single('document'), uploadProfileDocuments);

// Step 3: Perform score analysis
router.post('/analyze', scoreanalysis);

// Get user's score analysis history
router.get('/history/:profileId', getScoreHistory);

// Get user's profile document status
router.get('/profile-status/:profileId', getProfileDocumentStatus);

module.exports = router;