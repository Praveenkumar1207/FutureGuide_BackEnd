const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfile');
const { upload } = require("../config/cloudinaryConfig");

// Define file upload fields configuration
const fileUploadConfig = upload.fields([
  { name: "Profile_image_path", maxCount: 1 },
  { name: "Resume_path", maxCount: 1 },
  { name: "Job_description_path", maxCount: 1 },
  { name: "LinkedIn_data_path", maxCount: 1 },
]);

// Create a new user profile
router.post("/", fileUploadConfig, userProfileController.createProfile);

// Get all user profiles
router.get('/', userProfileController.getAllProfiles);

// Get a profile by login_id
router.get('/:login_id', userProfileController.getProfileByLoginId);

// Update a profile by login_id
router.put('/:login_id', fileUploadConfig, userProfileController.updateProfile);

// Delete a profile by login_id
router.delete('/:login_id', userProfileController.deleteProfile);

module.exports = router;

