const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const moment = require('moment-timezone');
require('dotenv').config();

// Set default timezone to IST for the entire application
moment.tz.setDefault("Asia/Kolkata");
console.log(`Server time set to IST: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? false  // In production, only allow same-origin requests
    : 'http://localhost:3000' // In development, allow localhost
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Add middleware to log requests with IST timestamp
app.use((req, res, next) => {
  console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${req.method} ${req.url}`);
  next();
});

// Database clean-up on startup
const mongoose = require('mongoose');
const db = mongoose.connection;

// Run clean-up after connecting to MongoDB
db.once('open', async () => {
  try {
    console.log('Performing startup database cleanup...');
    
    // Remove problematic records with null leaveDates
    const result = await db.collection('data-from-employee-dashboard').deleteMany({ 
      leaveDate: null 
    });
    console.log(`Startup cleanup: Removed ${result.deletedCount} problematic records with null leaveDates`);
  } catch (err) {
    console.error('Database startup cleanup error:', err);
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/admin', require('./routes/admin'));

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.get('/employee', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/employee.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Error:`, err);
  res.status(500).json({ msg: 'Server error', error: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with timezone set to IST`);
});
