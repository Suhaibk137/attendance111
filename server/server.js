const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Use static files (only for local development)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
} else {
  // For production, still serve static files for Vercel
  app.use(express.static(path.join(__dirname, '../public')));
}

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

const PORT = process.env.PORT || 3000;

// Listen in all environments, Vercel will manage this properly
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// For Vercel, we need to export the Express app
module.exports = app;
