const express = require('express');
const router = express.Router();
const jobdataController = require('../controllers/jobDataController');
 
// Job data routes
router.post('/', jobdataController.addjobData);
router.get('/', jobdataController.getjobData);
router.get('/:id', jobdataController.getjobDataById);
router.put('/:id', jobdataController.updatejobData);
router.delete('/:id', jobdataController.deletejobData);

module.exports = router;