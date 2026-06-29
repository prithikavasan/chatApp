require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

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
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // In development, allow any origin if CLIENT_URL is not set
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
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

// Test Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
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
