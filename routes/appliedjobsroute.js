const express = require('express');
const router = express.Router();
const appliedJob = require('../controllers/appliedJobsController');

// Applied jobs routes
router.post('/', appliedJob.addappliedJob);
router.get('/profile/:profileId', appliedJob.getAllAppliedJobs);

module.exports = router;
