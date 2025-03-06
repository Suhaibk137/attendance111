const mongoose = require('mongoose');

const employeeSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // Instead of mapping with alias, let's directly use the field name from the DB
  emCode: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  position: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Employee = mongoose.model('Employee', employeeSchema, 'elite-employee-mail-codes');

module.exports = Employee;