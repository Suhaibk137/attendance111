const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Connect to MongoDB with error handling
let dbConnected = false;
connectDB()
  .then(() => {
    dbConnected = true;
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    // Continue execution even if DB connection fails
  });

// Add middleware to check DB connection
app.use((req, res, next) => {
  if (!dbConnected && !req.path.includes('/health')) {
    return res.status(503).json({ 
      msg: 'Database connection not established, please try again later'
    });
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', dbConnected });
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
  console.error('Server error:', err);
  res.status(500).json({ msg: 'Server error', error: err.message });
});

const PORT = process.env.PORT || 3000;

// Only start the server if not in production (Vercel is serverless)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for serverless
module.exports = app;
