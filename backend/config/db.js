const mongoose = require('mongoose');

// Store DB connection error globally for diagnostic API checks
global.dbConnectionError = null;

const fallbackUri = 'mongodb+srv://prithikavasan512_db_user:chatApp@cluster0.ol3iezt.mongodb.net/chatcode?retryWrites=true&w=majority';

const connectDB = async () => {
  try {
    const dbUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== ''
      ? process.env.MONGODB_URI 
      : fallbackUri;

    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    global.dbConnectionError = null;
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    global.dbConnectionError = error.message;
  }
};

module.exports = connectDB;
