require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const LoginPagerouter = require('./routes/userauthenticationRoutes');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Health check route
app.use('/api/', LoginPagerouter);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;