const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const moment = require('moment-timezone');

// Set default timezone to IST
moment.tz.setDefault("Asia/Kolkata");

// Middleware to verify admin token
const adminAuth = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.admin) {
      return res.status(401).json({ msg: 'Not authorized as admin' });
    }
    
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// @route   GET api/admin/employees
// @desc    Get all employees
// @access  Admin
router.get('/employees', adminAuth, async (req, res) => {
  try {
    const employees = await Employee.find().select('-__v');
    res.json(employees);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET api/admin/attendance
// @desc    Get attendance records for a specific date
// @access  Admin
router.get('/attendance', adminAuth, async (req, res) => {
  try {
    const { date } = req.query;
    let queryDate;
    
    if (date) {
      queryDate = new Date(date);
    } else {
      // Use IST date
      queryDate = new Date(moment().format('YYYY-MM-DD'));
    }
    
    // Get start and end of day in IST
    const dateString = moment(queryDate).format('YYYY-MM-DD');
    const startOfDay = new Date(dateString);
    const endOfDay = new Date(moment(dateString).add(1, 'days').format('YYYY-MM-DD'));
    
    const attendance = await Attendance.find({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).populate('employee', 'name email emCode');

    // Get all employees
    const employees = await Employee.find();
    
    // Create result with all employees
    const result = employees.map(emp => {
      const record = attendance.find(a => a.employee && a.employee._id.toString() === emp._id.toString());
      
      if (record) {
        return record;
      }
      
      // Create a placeholder for employees without attendance records
      return {
        _id: null,
        employee: {
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          emCode: emp.emCode
        },
        date: queryDate,
        checkInTime: null,
        checkOutTime: null,
        status: 'Absent'
      };
    });
    
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET api/admin/attendance/monthly
// @desc    Get monthly attendance records for an employee
// @access  Admin
router.get('/attendance/monthly', adminAuth, async (req, res) => {
  try {
    const { year, month, employeeId } = req.query;
    
    // Create date range for the month using IST timezone
    const startDateStr = `${year}-${month}-01`;
    const startDate = new Date(startDateStr);
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
    const nextMonthYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
    const endDateStr = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;
    const endDate = new Date(endDateStr);
    
    // Build query
    let query = {
      date: {
        $gte: startDate,
        $lt: endDate
      }
    };
    
    // Add employee filter if specified
    if (employeeId && employeeId !== 'all') {
      query.employee = employeeId;
    }
    
    // Get attendance records
    const attendance = await Attendance.find(query)
      .populate('employee', 'name email emCode')
      .sort({ date: 1 });
    
    // If specific employee is selected, we need to fill in missing days with 'Absent'
    if (employeeId && employeeId !== 'all') {
      const employee = await Employee.findById(employeeId);
      
      if (employee) {
        // Generate all days in the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const allDays = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const date = new Date(dateStr);
          
          // Skip future dates
          if (date > new Date(moment().format('YYYY-MM-DD'))) {
            continue;
          }
          
          // Check if we have an attendance record for this day
          const existingRecord = attendance.find(record => {
            const recordDate = moment(record.date).format('YYYY-MM-DD');
            const currentDate = moment(date).format('YYYY-MM-DD');
            return recordDate === currentDate;
          });
          
          if (existingRecord) {
            allDays.push(existingRecord);
          } else {
            // Create a placeholder record for absent days
            allDays.push({
              _id: null,
              employee: {
                _id: employee._id,
                name: employee.name,
                email: employee.email,
                emCode: employee.emCode || employee.employeeCode
              },
              date: date,
              checkInTime: null,
              checkOutTime: null,
              status: 'Absent'
            });
          }
        }
        
        return res.json(allDays);
      }
    }
    
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/admin/attendance/update
// @desc    Update attendance status
// @access  Admin
router.post('/attendance/update', adminAuth, async (req, res) => {
  const { employeeId, date, status } = req.body;

  try {
    // Validate inputs
    if (!employeeId || !date || !status) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Format the date using IST timezone
    const dateStr = moment(date).format('YYYY-MM-DD');
    const nextDateStr = moment(dateStr).add(1, 'days').format('YYYY-MM-DD');
    
    // Find or create attendance record
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: new Date(dateStr),
        $lt: new Date(nextDateStr)
      }
    });
    
    if (!attendance) {
      attendance = new Attendance({
        employee: employeeId,
        date: new Date(dateStr),
        status
      });
    } else {
      attendance.status = status;
    }
    
    await attendance.save();
    
    // Create notification for employee
    try {
      const notification = new Notification({
        employee: employeeId,
        message: `Your attendance for ${moment(date).format('MMMM DD, YYYY')} has been marked as "${status}" by admin.`,
        type: 'Attendance'
      });
      
      await notification.save();
    } catch (notificationErr) {
      // Continue even if notification fails
      console.error('Failed to create notification:', notificationErr.message);
    }
    
    return res.json(attendance);
  } catch (err) {
    console.error('Attendance update error:', err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET api/admin/leave-requests
// @desc    Get all leave requests
// @access  Admin
router.get('/leave-requests', adminAuth, async (req, res) => {
  try {
    // Only get valid leave requests that were directly submitted by employees
    // Filter out records with invalid dates or automatically generated entries
    const leaveRequests = await LeaveRequest.find({
      // Make sure the leaveDate is valid (not null or undefined)
      leaveDate: { $exists: true, $ne: null }
    })
    .populate('employee', 'name email emCode')
    .sort({ createdAt: -1 });
    
    // Additional filtering to remove invalid dates
    const validLeaveRequests = leaveRequests.filter(request => {
      // Check if leaveDate is valid
      const date = new Date(request.leaveDate);
      return !isNaN(date.getTime());
    });
    
    res.json(validLeaveRequests);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/admin/leave-requests/update
// @desc    Update leave request status
// @access  Admin
router.post('/leave-requests/update', adminAuth, async (req, res) => {
  const { leaveId, status } = req.body;

  try {
    // Validate input
    if (!leaveId || !status) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    // Check if leave request exists
    const leaveRequest = await LeaveRequest.findById(leaveId);
    if (!leaveRequest) {
      return res.status(404).json({ msg: 'Leave request not found' });
    }
    
    // Update status
    leaveRequest.status = status;
    await leaveRequest.save();
    
    // Populate employee information after saving
    await leaveRequest.populate('employee', 'name _id');
    
    // Create notification for employee
    try {
      const notification = new Notification({
        employee: leaveRequest.employee._id,
        message: `Your leave request for ${moment(leaveRequest.leaveDate).format('MMMM DD, YYYY')} has been ${status.toLowerCase()}.`,
        type: 'Leave'
      });
      
      await notification.save();
    } catch (notificationErr) {
      console.error('Failed to create notification:', notificationErr.message);
      // Continue even if notification fails
    }
    
    // If approved, update attendance
    if (status === 'Approved') {
      try {
        const leaveDateStr = moment(leaveRequest.leaveDate).format('YYYY-MM-DD');
        const nextDateStr = moment(leaveDateStr).add(1, 'days').format('YYYY-MM-DD');
        
        // Find or create attendance record
        let attendance = await Attendance.findOne({
          employee: leaveRequest.employee._id,
          date: {
            $gte: new Date(leaveDateStr),
            $lt: new Date(nextDateStr)
          }
        });
        
        if (!attendance) {
          attendance = new Attendance({
            employee: leaveRequest.employee._id,
            date: new Date(leaveDateStr),
            status: 'Absent'  // Changed from "On Leave" to "Absent" as requested
          });
        } else {
          attendance.status = 'Absent';  // Changed from "On Leave" to "Absent" as requested
        }
        
        await attendance.save();
      } catch (attendanceErr) {
        console.error('Failed to update attendance:', attendanceErr.message);
        // Continue even if attendance update fails
      }
    }
    
    return res.json(leaveRequest);
  } catch (err) {
    console.error('Leave request update error:', err.message);
    return res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
