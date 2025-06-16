const express = require('express');
const LoginPagerouter = express.Router();
const authController = require('../controllers/userAuthentication');

// Auth routes
LoginPagerouter.post('/signup', authController.signup);
LoginPagerouter.post('/login', authController.login);
LoginPagerouter.post('/verify-otp', authController.verifyOTP);
LoginPagerouter.post('/forgot-password', authController.forgotPassword);
LoginPagerouter.post('/reset-password', authController.resetPassword);

module.exports = LoginPagerouter;