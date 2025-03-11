const mongoose = require('mongoose');
const moment = require('moment');

const leaveRequestSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  leaveDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v != null; // Explicitly check for null
      },
      message: 'Leave date cannot be null'
    }
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

// Add a pre-save hook to ensure leaveDate is never null
leaveRequestSchema.pre('save', function(next) {
  if (this.leaveDate === null) {
    return next(new Error('Leave date cannot be null'));
  }
  // Normalize date to start of day to prevent time-based issues
  if (this.leaveDate) {
    this.leaveDate = moment(this.leaveDate).startOf('day').toDate();
  }
  next();
});

// Modify the index to only apply when leaveDate is not null
leaveRequestSchema.index({ 
  employee: 1, 
  leaveDate: 1 
}, { 
  unique: true,
  partialFilterExpression: { leaveDate: { $type: "date" } } // Only apply index when leaveDate is a date
});

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema, 'data-from-employee-dashboard');

module.exports = LeaveRequest;
