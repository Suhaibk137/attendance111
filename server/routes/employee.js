const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const moment = require('moment');
const mongoose = require('mongoose');

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
    
    // FORCE SET THE DATE TO MARCH 12TH FOR TESTING
    // Remove this hardcoded date after testing!
    const forcedToday = "2025-03-12";
    const todayDate = new Date(forcedToday);
    const tomorrowDate = new Date(new Date(forcedToday).getTime() + 24*60*60*1000);
    
    console.log(`Using forced date: ${forcedToday}`);
    
    // Find if there's an existing attendance for the forced date
    let attendance = await Attendance.findOne({
      employee: req.employee.id,
      date: {
        $gte: todayDate,
        $lt: tomorrowDate
      }
    });
    
    console.log(`Existing attendance for forced date: ${attendance ? 'Yes' : 'No'}`);
    
    if (attendance) {
      // If record exists but no check-in time, update it
      if (!attendance.checkInTime) {
        attendance.checkInTime = new Date();
        attendance.status = 'Present';
        await attendance.save();
        console.log('Updated existing attendance record with check-in time');
      } else {
        console.log('Attendance record already has check-in time');
      }
      return res.json(attendance);
    }

    // Create new attendance record with forced date
    attendance = new Attendance({
      employee: req.employee.id,
      date: todayDate,
      checkInTime: new Date(),
      status: 'Present'
    });
    
    console.log('Creating new attendance record for forced date');
    const savedAttendance = await attendance.save();
    console.log(`Created new attendance record: ${savedAttendance._id}`);
    
    res.json(savedAttendance);
  } catch (err) {
    console.error('Check-in error details:', err);
    
    // More specific error message based on error type
    if (err.code === 11000) {
      // This is a duplicate key error
      console.error('Duplicate key error detected');
      
      try {
        // Try to find and return the existing record using forced date
        const forcedToday = "2025-03-12";
        const todayDate = new Date(forcedToday);
        const tomorrowDate = new Date(new Date(forcedToday).getTime() + 24*60*60*1000);
        
        const existingRecord = await Attendance.findOne({
          employee: req.employee.id,
          date: {
            $gte: todayDate,
            $lt: tomorrowDate
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
    
    // Use the same forced date as check-in
    const forcedToday = "2025-03-12";
    const todayDate = new Date(forcedToday);
    const tomorrowDate = new Date(new Date(forcedToday).getTime() + 24*60*60*1000);
    
    console.log(`Using forced date for check-out: ${forcedToday}`);
    
    // Find today's attendance record using forced date
    const attendance = await Attendance.findOne({
      employee: req.employee.id,
      date: {
        $gte: todayDate,
        $lt: tomorrowDate
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
    if (!leaveDate) {
      return res.status(400).json({ msg: 'Leave date is required' });
    }
    
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
    
    return res.status(500).json({ msg: 'Server error: ' + err.message });
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

// @route   POST api/employee/fix-database
// @desc    Fix database issues with null leaveDate
// @access  Private
router.post('/fix-database', auth, async (req, res) => {
  try {
    console.log('Starting database cleanup...');
    
    // Remove records with null leaveDate
    const deleteResult = await mongoose.connection.db
      .collection('data-from-employee-dashboard')
      .deleteMany({ 
        leaveDate: null 
      });
    
    console.log(`Deleted ${deleteResult.deletedCount} records with null leaveDate`);
    
    // Also remove potential duplicate attendance records for this employee
    const employeeId = req.employee.id;
    
    // Get all dates with attendance records for this employee
    const records = await Attendance.find({ employee: employeeId });
    console.log(`Found ${records.length} attendance records for employee ${employeeId}`);
    
    // Group by date
    const dateMap = {};
    let duplicatesRemoved = 0;
    
    for (const record of records) {
      const dateKey = moment(record.date).format('YYYY-MM-DD');
      
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = [];
      }
      
      dateMap[dateKey].push(record);
    }
    
    // Check for dates with multiple records
    for (const dateKey in dateMap) {
      const dateRecords = dateMap[dateKey];
      if (dateRecords.length > 1) {
        console.log(`Found ${dateRecords.length} records for date ${dateKey}`);
        
        // Sort by most complete (checked in & out)
        dateRecords.sort((a, b) => {
          const aComplete = (a.checkInTime ? 1 : 0) + (a.checkOutTime ? 1 : 0);
          const bComplete = (b.checkInTime ? 1 : 0) + (b.checkOutTime ? 1 : 0);
          return bComplete - aComplete;
        });
        
        // Keep the first one, delete the rest
        for (let i = 1; i < dateRecords.length; i++) {
          await Attendance.findByIdAndDelete(dateRecords[i]._id);
          duplicatesRemoved++;
        }
      }
    }
    
    return res.json({
      success: true,
      nullRecordsRemoved: deleteResult.deletedCount,
      duplicateAttendanceRecordsRemoved: duplicatesRemoved,
      message: `Database fixed. Removed ${deleteResult.deletedCount} null records and ${duplicatesRemoved} duplicate attendance records.`
    });
  } catch (err) {
    console.error('Database fix error:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

// @route   POST api/employee/reset-today
// @desc    Reset today's attendance (force delete March 12 record)
// @access  Private
router.post('/reset-today', auth, async (req, res) => {
  try {
    console.log(`Attempting to reset attendance for employee ${req.employee.id}`);
    
    // Use forced date for consistency
    const forcedToday = "2025-03-12";
    const todayDate = new Date(forcedToday);
    const tomorrowDate = new Date(new Date(forcedToday).getTime() + 24*60*60*1000);
    
    // Delete today's attendance record
    const result = await Attendance.deleteOne({
      employee: req.employee.id,
      date: {
        $gte: todayDate,
        $lt: tomorrowDate
      }
    });
    
    console.log(`Reset result: ${JSON.stringify(result)}`);
    
    res.json({
      success: true,
      deleted: result.deletedCount > 0,
      message: result.deletedCount > 0 
        ? "Today's attendance record has been reset. You can now check in again." 
        : "No attendance record found for today."
    });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

module.exports = router;
