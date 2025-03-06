const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Don't exit the process in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error; // Re-throw for handling in server.js
  }
};

module.exports = connectDB;
