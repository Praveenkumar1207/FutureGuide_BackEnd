const express = require('express');
const router = express.Router();  // Changed from LoginPagerouter to router for consistency
const authController = require('../controllers/userauthentication');

// Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Add a test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working' });
});

module.exports = router;  // Export router instead of LoginPagerouter