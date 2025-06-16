const User = require('../Models/userSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

// Load environment variables
require('dotenv').config();
const NODEMAILER_MAIL = process.env.NODEMAILER_MAIL;
const NODEMAILER_PASS = process.env.NODEMAILER_PASS;

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: NODEMAILER_MAIL,
        pass: NODEMAILER_PASS,
    },
});

// Generate OTP function
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP Email
async function sendOTPEmail(email, otp, subject) {
    try {
        await transporter.sendMail({
            from: NODEMAILER_MAIL,
            to: email,
            subject,
            text: `Your OTP is ${otp}`,
        });
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Hash password function
async function hashPassword(password) {
    try {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        throw new Error('Error hashing password');
    }
}

// Compare password function
async function comparePassword(plainPassword, hashedPassword) {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        throw new Error('Error comparing password');
    }
}

// Temporary in-memory store for pending signups
const pendingSignups = {};

// Signup Controller
const signup = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Generate OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store pending signup in memory
        pendingSignups[email] = {
            email,
            password: hashedPassword,
            otp,
            otpExpires
        };

        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp, 'Your OTP for JogBro Signup');
        if (!emailSent) {
            delete pendingSignups[email];
            return res.status(500).json({ message: 'Failed to send OTP email' });
        }

        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Login Controller
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare password with hashed password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Verify OTP Controller
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate input
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        // Check pending signup
        const pending = pendingSignups[email];
        if (!pending || pending.otp !== otp || pending.otpExpires < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Create user in DB
        await User.create({
            email: pending.email,
            password: pending.password
        });

        // Remove pending signup
        delete pendingSignups[email];

        res.json({ message: 'OTP verified successfully, user created' });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Forgot Password Controller
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Generate OTP
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp, 'Your OTP for JogBro Password Reset');
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send OTP email' });
        }

        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Reset Password Controller
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Validate input
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        // Find user with email and OTP
        const user = await User.findOne({ email, otp });

        if (!user || user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword);

        // Update password and clear OTP
        user.password = hashedNewPassword;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    signup,
    login,
    verifyOTP,
    forgotPassword,
    resetPassword
};