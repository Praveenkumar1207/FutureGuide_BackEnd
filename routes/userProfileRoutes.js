const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfile');
const { upload } = require("../config/cloudinaryConfig");

// Route: Create a new user profile with multiple file uploads
router.post(
  "/profile",
  upload.fields([
    { name: "Profile_image_path", maxCount: 1 },
    { name: "Resume_path", maxCount: 1 },
    { name: "Job_description_path", maxCount: 1 },
    { name: "LinkedIn_data_path", maxCount: 1 },
  ]),
  userProfileController.createProfile
);

// Route: Get all user profiles
router.get('/getprofile', userProfileController.getAllProfiles);

// Route: Get a profile by login_id
router.get('/profile/:login_id', userProfileController.getProfileByLoginId);

// Route: Update a profile by login_id (allow file uploads)
router.put(
  '/profile/:login_id',
  upload.fields([
    { name: "Profile_image_path", maxCount: 1 },
    { name: "Resume_path", maxCount: 1 },
    { name: "Job_description_path", maxCount: 1 },
    { name: "LinkedIn_data_path", maxCount: 1 },
  ]),
  userProfileController.updateProfile
);

// Route: Delete a profile by login_id
router.delete('/profile/:login_id', userProfileController.deleteProfile);

module.exports = router;
