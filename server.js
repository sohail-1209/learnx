/* 
 * LearnX - Backend Server
 * A Node.js Express server with PostgreSQL database
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');

// Initialize Express app
const app = express();
const PORT = 5000; // Force port 5000 as required for login functionality

// Middleware
app.use(cors({
  origin: '*', // Allow any origin for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// JSON parsing error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Bad JSON:', err);
    return res.status(400).json({ error: 'Invalid JSON format in request body' });
  }
  next(err);
});

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'learnx-frontend')));

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'hawa9', // Using the correct password
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Export pool for use in other modules
module.exports = { pool };

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const sessionRoutes = require('./routes/sessions');
const todoRoutes = require('./routes/todo');
const walletRoutes = require('./routes/wallet');
const chatRoutes = require('./routes/chat');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const teachRoutes = require('./routes/teach');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/todo', todoRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teach', teachRoutes);

// Default route to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'learnx-frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Provide more specific error messages based on error type
  if (err.code && err.code.startsWith('23')) {
    // PostgreSQL constraint violation errors (23xxx)
    return res.status(400).json({ 
      error: 'Database constraint violation',
      details: err.message
    });
  }
  
  if (err.code && err.code.startsWith('42')) {
    // PostgreSQL syntax or query errors (42xxx)
    return res.status(500).json({ 
      error: 'Database query error',
      details: err.message 
    });
  }
  
  if (err.code === 'ECONNREFUSED' || err.code === '08006') {
    // Database connection errors
    return res.status(503).json({ 
      error: 'Database connection failed',
      details: 'The server cannot connect to the database'
    });
  }
  
  // Default error message for other errors
  res.status(500).json({ 
    error: 'Something went wrong on the server',
    requestId: req.id
  });
});

// Start the server
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please free up port 5000 by stopping any other services using it.`);
      console.error('You can use "netstat -ano | findstr :5000" on Windows to find which process is using the port.');
      console.error('Then use "taskkill /F /PID <PID>" to kill that process.');
      process.exit(1);
    } else {
      console.error('Error starting server:', err);
      process.exit(1);
    }
  });
  
  return server;
};

startServer(PORT); 