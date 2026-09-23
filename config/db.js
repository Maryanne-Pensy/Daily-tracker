const mongoose = require('mongoose');

let isConnected = false;
let readyPromise = null;

// Resolves once the first connection attempt has finished (either way), so
// requests arriving during startup don't silently write to the local fallback.
const whenReady = () => readyPromise || Promise.resolve();

const connectDB = () => {
  readyPromise = connect();
  return readyPromise;
};

const connect = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/daily_sheet';
  
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // 3 second timeout for initial connection
    });
    isConnected = true;
    console.log(`[MongoDB] Successfully connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    isConnected = false;
    console.warn(`[MongoDB Warning] Could not connect to MongoDB (${err.message}).`);
    console.warn(`[MongoDB Warning] The application will use resilient local storage until a live MongoDB URI (local or MongoDB Atlas) is configured in .env.`);
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('[MongoDB] Connection established.');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[MongoDB] Disconnected.');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.warn(`[MongoDB Error] ${err.message}`);
  });
};

const getMongoStatus = () => {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    host: isConnected ? mongoose.connection.host : null,
    dbName: isConnected ? mongoose.connection.name : null,
    readyState: mongoose.connection.readyState
  };
};

module.exports = { connectDB, getMongoStatus, whenReady };
