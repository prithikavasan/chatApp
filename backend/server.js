require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const { socketHandler } = require('./socket/socketHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const friendRoutes = require('./routes/friendRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Trust proxy for secure cookies / rate limiter behind reverse proxy (Render)
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// Compress response payloads
app.use(compression());

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows media resource sharing
  contentSecurityPolicy: false,     // Prevents CSP headers from blocking websocket protocols
}));

// Diagnostics on boot (helps troubleshoot Render dashboards)
console.log('--- Configuration Diagnostics ---');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- PORT: ${process.env.PORT || 5000}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? 'LOADED' : 'NOT CONFIGURED (Will fallback to local)'}`);
console.log(`- CLIENT_URL: ${process.env.CLIENT_URL || 'NOT CONFIGURED'}`);
console.log(`- CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? 'LOADED' : 'NOT CONFIGURED'}`);
console.log('---------------------------------');

// Normalize origins to prevent trailing slash configuration typos (includes hardcoded fallback for Vercel production client URL)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://client-livid-seven-78.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean).map(url => url.replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    if (allowedOrigins.indexOf(normalizedOrigin) === -1) {
      // In development, allow any origin if CLIENT_URL is not set
      if (process.env.NODE_ENV !== 'production' && !process.env.CLIENT_URL) {
        return callback(null, true);
      }
      return callback(null, false); // Rejects CORS without throwing a 500 server crash error
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Mount REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Test Endpoint with DB state diagnostics
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  res.status(200).json({
    status: dbState === 1 ? 'healthy' : 'unhealthy',
    database: states[dbState] || 'unknown',
    error: global.dbConnectionError || null,
    timestamp: new Date(),
  });
});

// 404 & Global Error Handler Middlewares
app.use(notFound);
app.use(errorHandler);

// Initialize Socket.io
const io = socketio(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Mount socket event listeners
socketHandler(io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
