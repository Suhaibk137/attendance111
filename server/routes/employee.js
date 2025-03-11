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
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/employee/check-in
// @desc    Check in
// @access  Private
router.post('/check-in', auth, async (req, res) => {
  try {
    console.log(`Check-in attempt for employee ${req.employee.id}`);
    
    // First, clean up any records with null dates
    const cleanupResult = await Attendance.deleteMany({
      employee: req.employee.id,
      date: null
    });
    console.log(`Cleaned up ${cleanupResult.deletedCount} records with null dates`);
    
    const today = moment().startOf('day');
    console.log(`Today's date (server time): ${today.format('YYYY-MM-DD')}`);
    
    // Check if employee has already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: req.employee.id,
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    });

    console.log(`Existing attendance record found: ${existingAttendance ? 'Yes' : 'No'}`);
    
    const now = new Date();

    if (existingAttendance) {
      console.log(`Existing record ID: ${existingAttendance._id}`);
      // If record exists but no check-in time, update it
      if (!existingAttendance.checkInTime) {
        console.log('No check-in time on existing record, updating...');
        existingAttendance.checkInTime = now;
        existingAttendance.status = 'Present';
        await existingAttendance.save();
        console.log('Record updated successfully');
      } else {
        console.log(`Already checked in at: ${existingAttendance.checkInTime}`);
      }
      return res.json(existingAttendance);
    }

    // Create new attendance record with more precise date
    // Convert the date to a string and back to ensure consistent date format
    const formattedDate = today.format('YYYY-MM-DD');
    const normalizedDate = new Date(formattedDate);
    
    console.log(`Creating new attendance record for date: ${formattedDate}`);
    
    const attendance = new Attendance({
      employee: req.employee.id,
      date: normalizedDate,
      checkInTime: now,
      status: 'Present'
    });

    console.log(`New attendance record prepared: ${JSON.stringify(attendance)}`);
    
    const savedAttendance = await attendance.save();
    console.log(`Attendance record saved successfully with ID: ${savedAttendance._id}`);
    
    res.json(savedAttendance);
  } catch (err) {
    console.error('Check-in error details:', err);
    
    // More specific error message based on error type
    if (err.code === 11000) {
      // This is a duplicate key error
      console.error('Duplicate key error detected');
      
      try {
        // Try to find and return the existing record
        const today = moment().startOf('day');
        const existingRecord = await Attendance.findOne({
          employee: req.employee.id,
          date: {
            $gte: today.toDate(),
            $lt: moment(today).endOf('day').toDate()
          }
        });
        
        if (existingRecord) {
          console.log(`Found existing record during error recovery: ${existingRecord._id}`);
          return res.json(existingRecord);
        }
      } catch (recoveryErr) {
        console.error('Error during recovery attempt:', recoveryErr);
      }
      
      return res.status(400).json({ msg: 'Already checked in today. Please try refreshing the page.' });
    }
    
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

// @route   POST api/employee/check-out
// @desc    Check out
// @access  Private
router.post('/check-out', auth, async (req, res) => {
  try {
    console.log(`Check-out attempt for employee ${req.employee.id}`);
    
    const today = moment().startOf('day');
    console.log(`Today's date (server time): ${today.format('YYYY-MM-DD')}`);
    
    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: req.employee.id,
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    });

    console.log(`Attendance record found: ${attendance ? 'Yes' : 'No'}`);
    
    if (!attendance) {
      return res.status(400).json({ msg: 'Please check in first' });
    }

    if (!attendance.checkInTime) {
      return res.status(400).json({ msg: 'Please check in first' });
    }

    if (attendance.checkOutTime) {
      console.log(`Already checked out at: ${attendance.checkOutTime}`);
      return res.status(400).json({ msg: 'Already checked out today' });
    }

    // Update check out time
    attendance.checkOutTime = new Date();
    console.log(`Setting check-out time to: ${attendance.checkOutTime}`);
    
    await attendance.save();
    console.log('Check-out successful');

    res.json(attendance);
  } catch (err) {
    console.error('Check-out error details:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

// @route   POST api/employee/leave-request
// @desc    Submit leave request
// @access  Private
router.post('/leave-request', auth, async (req, res) => {
  const { leaveDate, reason } = req.body;

  try {
    // Format the date properly for MongoDB
    const formattedLeaveDate = moment(leaveDate).format('YYYY-MM-DD');
    
    // Create a leave request with properly formatted date
    const leave = new LeaveRequest({
      employee: req.employee.id,
      leaveDate: new Date(formattedLeaveDate),
      reason
    });

    await leave.save();

    return res.json(leave);
  } catch (err) {
    console.error('Leave request error:', err.message);
    
    // If it's a duplicate key error, send a meaningful message
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'You already have a leave request for this date' });
    }
    
    return res.status(500).json({ msg: 'Server error' });
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
    res.status(500).json({ msg: 'Server error' });
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
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/employee/fix-attendance
// @desc    Fix duplicate attendance records
// @access  Private
router.post('/fix-attendance', auth, async (req, res) => {
  try {
    console.log(`Attempting to fix attendance records for employee ${req.employee.id}`);
    
    // Find all attendance records for this employee
    const records = await Attendance.find({ employee: req.employee.id });
    console.log(`Found ${records.length} total attendance records`);
    
    // Group by date (YYYY-MM-DD format)
    const recordsByDate = {};
    records.forEach(record => {
      const dateKey = moment(record.date).format('YYYY-MM-DD');
      if (!recordsByDate[dateKey]) {
        recordsByDate[dateKey] = [];
      }
      recordsByDate[dateKey].push(record);
    });
    
    // For dates with multiple records, keep only the most complete one
    let cleaned = 0;
    for (const dateKey in recordsByDate) {
      const dateRecords = recordsByDate[dateKey];
      if (dateRecords.length > 1) {
        console.log(`Found ${dateRecords.length} records for date ${dateKey}`);
        
        // Sort by completeness (records with both check-in and check-out first)
        dateRecords.sort((a, b) => {
          const aScore = (a.checkInTime ? 1 : 0) + (a.checkOutTime ? 1 : 0);
          const bScore = (b.checkInTime ? 1 : 0) + (b.checkOutTime ? 1 : 0);
          return bScore - aScore;
        });
        
        // Keep the first (most complete) record, delete the rest
        for (let i = 1; i < dateRecords.length; i++) {
          console.log(`Deleting duplicate record ${dateRecords[i]._id} for date ${dateKey}`);
          await Attendance.findByIdAndDelete(dateRecords[i]._id);
          cleaned++;
        }
      }
    }
    
    console.log(`Database fix completed. Cleaned ${cleaned} duplicate records.`);
    res.json({ 
      message: `Database fixed. Cleaned ${cleaned} duplicate records.`,
      success: true,
      recordsCleaned: cleaned
    });
  } catch (err) {
    console.error('Fix attendance error:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

module.exports = router;
