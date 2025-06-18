const express = require('express');
const router = express.Router();
const appliedJob = require('../controllers/appliedJobsController'); // FIX: Correct path to controller

// Debug route registration

// Check if API is working route
router.get('/isworking', appliedJob.isworking);

// Add an explicit root route for testing
// router.get('/', (req, res) => {
//   res.json({ message: "Applied Jobs API root" });
// });

// Other routes
router.post('/addappliedJob', appliedJob.addappliedJob);
router.get('/getAllAppliedJobs/:profileId', appliedJob.getAllAppliedJobs);

module.exports = router;