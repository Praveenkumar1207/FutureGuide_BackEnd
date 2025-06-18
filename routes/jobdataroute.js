const express = require('express');
const router =  express.Router();
const jobdataController = require('../controllers/jobDataController');
 
router.post('/addjobData', jobdataController.addjobData );
router.put('/updatejobData/:id', jobdataController.updatejobData );
router.delete('/deletejobData/:id', jobdataController.deletejobData );
router.get('/getjobData', jobdataController.getjobData );
router.get('/getjobData/:id', jobdataController.getjobDataById );

module.exports = router;