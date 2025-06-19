const express = require('express');
const router = express.Router();
const authController = require('../controllers/userauthentication');

// Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;