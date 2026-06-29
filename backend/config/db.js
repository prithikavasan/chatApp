const mongoose = require('mongoose');

// Store DB connection error globally for diagnostic API checks
global.dbConnectionError = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatcode');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    global.dbConnectionError = null;
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    global.dbConnectionError = error.message;
  }
};

module.exports = connectDB;
