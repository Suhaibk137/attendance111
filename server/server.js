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
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? false  // In production, only allow same-origin requests
    : 'http://localhost:3000' // In development, allow localhost
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});