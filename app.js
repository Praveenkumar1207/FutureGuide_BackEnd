require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const LoginPagerouter = require('./routes/userauthenticationRoutes');
const userProfileRoutes = require('./routes/userProfileRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');
const scoreanalysisRoutes = require('./routes/jdanalysisroute');
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
app.use('/api/auth', LoginPagerouter);
app.use('/api/profile', userProfileRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/score-analysis', scoreanalysisRoutes);

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