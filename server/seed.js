const mongoose = require('mongoose');
const Employee = require('./models/Employee');
require('dotenv').config();

const employeeData = [
  {
    name: "Ashid",
    emCode: "ER 1040",
    email: "ashid@eliteresumes.co",
    position: "Digital Marketing Associate"
  }
  // Add more sample employees as needed
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding');
    
    // Clear existing data
    await Employee.deleteMany({});
    console.log('Cleared existing employee data');
    
    // Insert new data
    const employees = await Employee.insertMany(employeeData);
    console.log(`Added ${employees.length} employees to the database`);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();