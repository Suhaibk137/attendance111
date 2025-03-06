const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// @route   POST api/auth/login
// @desc    Employee login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, employeeCode } = req.body;

  try {
    console.log('Login attempt:', { email, employeeCode });
    
    // Check if employee exists
    const employee = await Employee.findOne({ email });
    
    console.log('Employee found:', employee ? 'Yes' : 'No');
    if (employee) {
      console.log('Database employee fields:', Object.keys(employee._doc));
      console.log('Database emCode:', employee.emCode);
    }
    
    if (!employee) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check if employee code matches - using emCode from database
    const isMatch = employee.emCode === employeeCode;
    
    console.log('Code matches:', isMatch ? 'Yes' : 'No');

    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create JWT
    const payload = {
      employee: {
        id: employee.id,
        name: employee.name,
        position: employee.position
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/admin
// @desc    Admin login
// @access  Public
router.post('/admin', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check admin credentials
    if (username !== 'Support@eliteresumes.in' || password !== 'Elite@143') {
      return res.status(400).json({ msg: 'Invalid admin credentials' });
    }

    // Create JWT for admin
    const payload = {
      admin: true
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;