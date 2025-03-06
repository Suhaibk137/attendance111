const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const moment = require('moment');

// Middleware to verify employee token
const auth = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.employee = decoded.employee;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// @route   GET api/employee/me
// @desc    Get current employee
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee.id).select('-__v');
    res.json(employee);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/employee/check-in
// @desc    Check in
// @access  Private
router.post('/check-in', auth, async (req, res) => {
  try {
    // First, clean up any records with null dates
    await Attendance.deleteMany({
      employee: req.employee.id,
      date: null
    });
    
    const today = moment().startOf('day');
    
    // Check if employee has already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: req.employee.id,
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    });

    if (existingAttendance && existingAttendance.checkInTime) {
      return res.status(400).json({ msg: 'Already checked in today' });
    }

    const now = new Date();

    if (existingAttendance) {
      // Update existing record
      existingAttendance.checkInTime = now;
      existingAttendance.status = 'Present';
      await existingAttendance.save();
      return res.json(existingAttendance);
    }

    // Create new attendance record - ensure date is set correctly
    const attendance = new Attendance({
      employee: req.employee.id,
      date: today.toDate(),  // Explicitly set to today
      checkInTime: now,
      status: 'Present'
    });

    await attendance.save();
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/employee/check-out
// @desc    Check out
// @access  Private
router.post('/check-out', auth, async (req, res) => {
  try {
    const today = moment().startOf('day');
    
    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: req.employee.id,
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    });

    if (!attendance) {
      return res.status(400).json({ msg: 'Please check in first' });
    }

    if (!attendance.checkInTime) {
      return res.status(400).json({ msg: 'Please check in first' });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ msg: 'Already checked out today' });
    }

    // Update check out time
    attendance.checkOutTime = new Date();
    await attendance.save();

    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/employee/leave-request
// @desc    Submit leave request
// @access  Private
router.post('/leave-request', auth, async (req, res) => {
  const { leaveDate, reason } = req.body;

  try {
    const leave = new LeaveRequest({
      employee: req.employee.id,
      leaveDate,
      reason
    });

    await leave.save();

    res.json(leave);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/employee/attendance
// @desc    Get current month attendance
// @access  Private
router.get('/attendance', auth, async (req, res) => {
  try {
    const startOfMonth = moment().startOf('month');
    const endOfMonth = moment().endOf('month');

    const attendance = await Attendance.find({
      employee: req.employee.id,
      date: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate()
      }
    }).sort({ date: 1 });

    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/employee/notifications
// @desc    Get employee notifications
// @access  Private
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      employee: req.employee.id
    })
    .sort({ createdAt: -1 })
    .limit(5);

    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;