require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const LoginPagerouter = require('./routes/userauthenticationRoutes');
const userProfileRoutes = require('./routes/userProfileRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');
const jobDataRoutes = require('./routes/jobdataroute');
const appliedJobsRoutes = require('./routes/appliedjobsroute');
const chatRoutes = require('./routes/chatroutes'); // Add missing import for chat routes
const scoreanalysisroute = require('./routes/jdanalysisroute')

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

// Routes with consistent naming
app.use('/api/auth', LoginPagerouter);
app.use('/api/profiles', userProfileRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/jobs', jobDataRoutes);
app.use('/api/applications', appliedJobsRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/analyses', scoreanalysisroute);

// Global test route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

// Error handling middleware - uncomment and update
app.use((err, req, res, next) => {
  console.error('Express error handler caught:', err.message);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler - uncomment
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;