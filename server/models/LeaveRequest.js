const mongoose = require('mongoose');

const leaveRequestSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  leaveDate: {
    type: Date,
    required: true
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

// Add an index for employee and leaveDate to ensure uniqueness
leaveRequestSchema.index({ employee: 1, leaveDate: 1 }, { unique: true });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema, 'data-from-employee-dashboard');

module.exports = LeaveRequest;
