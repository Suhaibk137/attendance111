const mongoose = require('mongoose');
const moment = require('moment');

const attendanceSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: function() {
      // Use moment to get today's date with time set to midnight (00:00:00)
      return moment().startOf('day').toDate();
    },
    // Apply getter to normalize the date to midnight to prevent time-based comparison issues
    get: function(date) {
      return moment(date).startOf('day').toDate();
    }
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half-Day', 'On Leave'],
    default: 'Absent'
  }
}, {
  timestamps: true,
  toJSON: { getters: true }, // Ensure the getter is applied when converting to JSON
  toObject: { getters: true } // Ensure the getter is applied when converting to object
});

// Create a compound index to ensure one attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Pre-save middleware to normalize date to midnight
attendanceSchema.pre('save', function(next) {
  if (this.date) {
    this.date = moment(this.date).startOf('day').toDate();
  }
  next();
});

// Add a static method to find an attendance record by employee and date
attendanceSchema.statics.findByEmployeeAndDate = async function(employeeId, date) {
  const normalizedDate = moment(date).startOf('day').toDate();
  return this.findOne({
    employee: employeeId,
    date: {
      $gte: normalizedDate,
      $lt: moment(normalizedDate).endOf('day').toDate()
    }
  });
};

// Add a static method to create or update an attendance record
attendanceSchema.statics.createOrUpdateAttendance = async function(employeeId, date, updateData) {
  const normalizedDate = moment(date).startOf('day').toDate();
  
  // Try to find existing record
  let record = await this.findOne({
    employee: employeeId,
    date: {
      $gte: normalizedDate,
      $lt: moment(normalizedDate).endOf('day').toDate()
    }
  });
  
  // If record exists, update it
  if (record) {
    Object.keys(updateData).forEach(key => {
      record[key] = updateData[key];
    });
    return await record.save();
  }
  
  // If no record exists, create a new one
  record = new this({
    employee: employeeId,
    date: normalizedDate,
    ...updateData
  });
  
  return await record.save();
};

const Attendance = mongoose.model('Attendance', attendanceSchema, 'data-from-employee-dashboard');

module.exports = Attendance;
