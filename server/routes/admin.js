const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const moment = require('moment');

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
    res.status(500).send('Server error');
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
      queryDate = new Date();
    }
    
    const startOfDay = moment(queryDate).startOf('day');
    const endOfDay = moment(queryDate).endOf('day');
    
    const attendance = await Attendance.find({
      date: {
        $gte: startOfDay.toDate(),
        $lte: endOfDay.toDate()
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
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/attendance/monthly
// @desc    Get monthly attendance records for an employee
// @access  Admin
router.get('/attendance/monthly', adminAuth, async (req, res) => {
  try {
    const { year, month, employeeId } = req.query;
    
    // Create date range for the month
    const startDate = moment(`${year}-${month}-01`).startOf('month');
    const endDate = moment(startDate).endOf('month');
    
    // Build query
    let query = {
      date: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
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
        const daysInMonth = endDate.date();
        const allDays = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = moment(`${year}-${month}-${day}`).startOf('day');
          
          // Skip future dates
          if (date > moment()) {
            continue;
          }
          
          // Check if we have an attendance record for this day
          const existingRecord = attendance.find(record => {
            const recordDate = moment(record.date).startOf('day');
            return recordDate.isSame(date, 'day');
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
              date: date.toDate(),
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
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/attendance/update
// @desc    Update attendance status
// @access  Admin
router.post('/attendance/update', adminAuth, async (req, res) => {
  const { employeeId, date, status } = req.body;

  try {
    // Format the date
    const attendanceDate = moment(date).startOf('day');
    
    // Find or create attendance record
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: attendanceDate.toDate(),
        $lt: moment(attendanceDate).endOf('day').toDate()
      }
    });
    
    if (!attendance) {
      attendance = new Attendance({
        employee: employeeId,
        date: attendanceDate.toDate(),
        status
      });
    } else {
      attendance.status = status;
    }
    
    await attendance.save();
    
    // Create notification for employee
    const notification = new Notification({
      employee: employeeId,
      message: `Your attendance for ${moment(date).format('MMMM DD, YYYY')} has been marked as "${status}" by admin.`,
      type: 'Attendance'
    });
    
    await notification.save();
    
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/leave-requests
// @desc    Get all leave requests
// @access  Admin
router.get('/leave-requests', adminAuth, async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find()
      .populate('employee', 'name email emCode')
      .sort({ createdAt: -1 });
    
    res.json(leaveRequests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/leave-requests/update
// @desc    Update leave request status
// @access  Admin
router.post('/leave-requests/update', adminAuth, async (req, res) => {
  const { leaveId, status } = req.body;

  try {
    const leaveRequest = await LeaveRequest.findById(leaveId)
      .populate('employee', 'name');
    
    if (!leaveRequest) {
      return res.status(404).json({ msg: 'Leave request not found' });
    }
    
    leaveRequest.status = status;
    await leaveRequest.save();
    
    // Create notification for employee
    const notification = new Notification({
      employee: leaveRequest.employee._id,
      message: `Your leave request for ${moment(leaveRequest.leaveDate).format('MMMM DD, YYYY')} has been ${status.toLowerCase()}.`,
      type: 'Leave'
    });
    
    await notification.save();
    
    // If approved, update attendance
    if (status === 'Approved') {
      const leaveDate = moment(leaveRequest.leaveDate).startOf('day');
      
      // Find or create attendance record
      let attendance = await Attendance.findOne({
        employee: leaveRequest.employee._id,
        date: {
          $gte: leaveDate.toDate(),
          $lt: moment(leaveDate).endOf('day').toDate()
        }
      });
      
      if (!attendance) {
        attendance = new Attendance({
          employee: leaveRequest.employee._id,
          date: leaveDate.toDate(),
          status: 'Absent'  // Changed from "On Leave" to "Absent" as requested
        });
      } else {
        attendance.status = 'Absent';  // Changed from "On Leave" to "Absent" as requested
      }
      
      await attendance.save();
    }
    
    res.json(leaveRequest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;