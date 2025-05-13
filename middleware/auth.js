/**
 * LearnX - Authentication Middleware
 * Provides JWT verification and role-based access control
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool } = require('../server');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'learnx_secure_jwt_secret_key';

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN
  
  console.log('Auth header present:', !!authHeader);
  console.log('Token present:', !!token);

  if (!token) {
    console.log('No token provided in request:', {
      path: req.path,
      method: req.method,
      headers: Object.keys(req.headers)
    });
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user data in request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.isTeacher = decoded.isTeacher;
    req.isAdmin = decoded.isAdmin;
    
    console.log('Token verified successfully for user:', {
      userId: decoded.userId,
      email: decoded.email,
      token: token.substring(0, 20) + '...' // Log part of the token for debugging
    });
    
    next();
  } catch (error) {
    console.error('Token verification failed:', {
      error: error.message,
      token: token.substring(0, 20) + '...',
      secret: JWT_SECRET.substring(0, 5) + '...'
    });
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Check if user is a teacher
const isTeacher = (req, res, next) => {
  if (!req.isTeacher) {
    return res.status(403).json({ error: 'Forbidden - Teacher access required' });
  }
  next();
};

// Check if user is an admin
const isAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  next();
};

// Check if user is the owner of the resource
const isResourceOwner = async (req, res, next) => {
  try {
    // Get the resource type and ID from route parameters
    const { resourceType, id } = req.params;
    
    if (!resourceType || !id) {
      return res.status(400).json({ error: 'Bad request - Resource type and ID required' });
    }
    
    let query;
    
    // Determine the appropriate query based on resource type
    switch (resourceType) {
      case 'course':
        query = 'SELECT teacher_id FROM courses WHERE id = $1';
        break;
      case 'session':
        query = 'SELECT teacher_id FROM sessions WHERE id = $1';
        break;
      case 'profile':
        query = 'SELECT id FROM users WHERE id = $1';
        break;
      case 'todo':
        query = 'SELECT user_id FROM todos WHERE id = $1';
        break;
      default:
        return res.status(400).json({ error: 'Bad request - Invalid resource type' });
    }
    
    // Execute query to check ownership
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const ownerId = result.rows[0].teacher_id || result.rows[0].user_id || result.rows[0].id;
    
    // Check if the requester is the owner or an admin
    if (req.userId !== ownerId && !req.isAdmin) {
      return res.status(403).json({ error: 'Forbidden - You do not own this resource' });
    }
    
    next();
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    return res.status(500).json({ error: 'Server error checking resource ownership' });
  }
};

module.exports = {
  verifyToken,
  isTeacher,
  isAdmin,
  isResourceOwner
}; 