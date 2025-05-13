/**
 * LearnX - Authentication Routes
 * Handles user registration, login, and token validation
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../server');
const { verifyToken } = require('../middleware/auth');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'learnx_secure_jwt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register a new user
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    const { email, password, firstName, lastName, isTeacher, skills, bio, headline, profilePic } = req.body;
    
    // Validate input
    if (!email || !password || !firstName || !lastName) {
      console.log('Missing fields:', { email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName });
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check email format 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    
    // Check password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if email is already in use
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert new user
    const newUser = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, is_teacher, bio, profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, is_teacher, created_at',
      [email, hashedPassword, firstName, lastName, isTeacher || false, bio, profilePic]
    );
    
    // Create user profile
    await pool.query(
      `INSERT INTO user_profile (user_id, headline, skills) 
       VALUES ($1, $2, $3)`,
      [
        newUser.rows[0].id, 
        headline || (isTeacher ? 'Teacher at LearnX' : 'Student at LearnX'),
        skills && skills.length > 0 ? skills : ['New User']
      ]
    );
    
    // Create wallet for the user
    await pool.query(
      'INSERT INTO wallet (user_id) VALUES ($1)',
      [newUser.rows[0].id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser.rows[0].id,
        email: newUser.rows[0].email,
        isTeacher: newUser.rows[0].is_teacher,
        isAdmin: false
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Send success response with token
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        firstName: newUser.rows[0].first_name,
        lastName: newUser.rows[0].last_name,
        isTeacher: newUser.rows[0].is_teacher,
        createdAt: newUser.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        isTeacher: user.is_teacher,
        isAdmin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Send success response with token
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isTeacher: user.is_teacher,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Verify token and get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    // Get user data from database
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, profile_pic, bio, is_teacher, is_admin FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePic: user.profile_pic,
        bio: user.bio,
        isTeacher: user.is_teacher,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ error: 'Server error verifying authentication' });
  }
});

// Update password
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    
    // Get user from database
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password in database
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, req.userId]
    );
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Server error updating password' });
  }
});

// Create a special route for adding test data (for demo purposes)
router.post('/add-default-data/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 3;
    
    // Only add data if database is empty
    const userCheckResult = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCheckResult.rows[0].count);
    
    if (userCount > 0) {
      return res.status(200).json({ message: 'Data already exists', count: userCount });
    }
    
    // Add test users
    const defaultPassword = await bcrypt.hash('password123', 10);
    
    // Create admin user
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, is_teacher, is_admin, bio) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      ['admin@learnx.com', defaultPassword, 'Admin', 'User', true, true, 'Administrator of the LearnX platform.']
    );
    
    const testUsers = [
      { email: 'john@example.com', firstName: 'John', lastName: 'Smith', isTeacher: true, bio: 'Experienced math and science tutor with 10+ years experience.' },
      { email: 'emma@example.com', firstName: 'Emma', lastName: 'Wilson', isTeacher: true, bio: 'Language specialist teaching Spanish and French.' },
      { email: 'michael@example.com', firstName: 'Michael', lastName: 'Brown', isTeacher: false, bio: 'Student learning web development and design.' },
      { email: 'sophia@example.com', firstName: 'Sophia', lastName: 'Davis', isTeacher: false, bio: 'High school student preparing for college.' },
      { email: 'daniel@example.com', firstName: 'Daniel', lastName: 'Miller', isTeacher: true, bio: 'Computer science professor specializing in AI and machine learning.' }
    ];
    
    const userIds = [];
    
    // Add the specified number of test users
    for (let i = 0; i < Math.min(count, testUsers.length); i++) {
      const user = testUsers[i];
      const result = await pool.query(
        'INSERT INTO users (email, password, first_name, last_name, is_teacher, bio) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [user.email, defaultPassword, user.firstName, user.lastName, user.isTeacher, user.bio]
      );
      
      userIds.push(result.rows[0].id);
      
      // Create user profile
      await pool.query(
        'INSERT INTO user_profile (user_id, headline, skills) VALUES ($1, $2, $3)',
        [result.rows[0].id, `${user.isTeacher ? 'Teacher' : 'Student'} at LearnX`, ['Communication', 'Problem Solving']]
      );
      
      // Create wallet
      await pool.query(
        'INSERT INTO wallet (user_id, balance) VALUES ($1, $2)',
        [result.rows[0].id, Math.floor(Math.random() * 500) + 100]
      );
    }
    
    // Create courses for teachers
    const courses = [
      { title: 'Introduction to Mathematics', description: 'Learn the basics of mathematics including algebra, geometry, and calculus.', category: 'Mathematics', price: 49.99 },
      { title: 'Beginner Spanish', description: 'Start learning Spanish from scratch with this beginner-friendly course.', category: 'Language', price: 39.99 },
      { title: 'Advanced Web Development', description: 'Master HTML, CSS, JavaScript, and modern frameworks.', category: 'Programming', price: 59.99 },
      { title: 'Intro to Machine Learning', description: 'Learn the fundamentals of machine learning and AI.', category: 'Computer Science', price: 79.99 }
    ];
    
    // Add courses for teacher users
    for (const userId of userIds) {
      const userResult = await pool.query('SELECT is_teacher FROM users WHERE id = $1', [userId]);
      
      if (userResult.rows[0].is_teacher) {
        const courseIndex = Math.floor(Math.random() * courses.length);
        const course = courses[courseIndex];
        
        await pool.query(
          'INSERT INTO courses (teacher_id, title, description, category, price, level, is_published) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, course.title, course.description, course.category, course.price, 'Beginner', true]
        );
      }
    }
    
    // Create upcoming sessions
    const now = new Date();
    
    // For each teacher, create a couple of sessions
    for (const userId of userIds) {
      const userResult = await pool.query('SELECT is_teacher FROM users WHERE id = $1', [userId]);
      
      if (userResult.rows[0].is_teacher) {
        // Get courses by this teacher
        const coursesResult = await pool.query('SELECT id, title FROM courses WHERE teacher_id = $1', [userId]);
        
        if (coursesResult.rows.length > 0) {
          const course = coursesResult.rows[0];
          
          // Create a session for today
          const todaySession = new Date(now);
          todaySession.setHours(now.getHours() + 2);
          
          await pool.query(
            'INSERT INTO sessions (course_id, teacher_id, title, description, start_time, end_time, price, max_students) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [course.id, userId, `${course.title} - Live Session`, 'Join this interactive live session to learn and ask questions.', todaySession, new Date(todaySession.getTime() + 60 * 60 * 1000), 19.99, 10]
          );
          
          // Create a session for tomorrow
          const tomorrowSession = new Date(now);
          tomorrowSession.setDate(now.getDate() + 1);
          tomorrowSession.setHours(10, 0, 0, 0);
          
          await pool.query(
            'INSERT INTO sessions (course_id, teacher_id, title, description, start_time, end_time, price, max_students) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [course.id, userId, `${course.title} - Practice Session`, 'A practice session to reinforce your learning.', tomorrowSession, new Date(tomorrowSession.getTime() + 90 * 60 * 1000), 24.99, 5]
          );
        }
      }
    }
    
    // Create some bookings for sessions
    const sessionsResult = await pool.query('SELECT id, teacher_id FROM sessions LIMIT 5');
    
    for (const session of sessionsResult.rows) {
      // Find student users
      const studentsResult = await pool.query('SELECT id FROM users WHERE is_teacher = FALSE LIMIT 3');
      
      for (const student of studentsResult.rows) {
        // Avoid booking your own session
        if (student.id !== session.teacher_id) {
          await pool.query(
            'INSERT INTO bookings (session_id, user_id, status) VALUES ($1, $2, $3)',
            [session.id, student.id, 'confirmed']
          );
          
          // Update session current students count
          await pool.query(
            'UPDATE sessions SET current_students = current_students + 1 WHERE id = $1',
            [session.id]
          );
        }
      }
    }
    
    // Create some todo items for users
    const todoItems = [
      'Complete homework assignment',
      'Review course materials',
      'Prepare for upcoming test',
      'Read chapter 5',
      'Watch tutorial video',
      'Practice coding exercises'
    ];
    
    for (const userId of userIds) {
      for (let i = 0; i < 3; i++) {
        const todoIndex = Math.floor(Math.random() * todoItems.length);
        const dueDate = new Date(now);
        dueDate.setDate(now.getDate() + Math.floor(Math.random() * 7) + 1);
        
        await pool.query(
          'INSERT INTO todos (user_id, title, description, due_date, priority) VALUES ($1, $2, $3, $4, $5)',
          [userId, todoItems[todoIndex], 'This is a sample todo item.', dueDate, ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]]
        );
      }
    }
    
    res.status(200).json({ 
      message: 'Default data added successfully',
      users: userIds.length,
      testUserCredentials: {
        email: 'john@example.com',
        password: 'password123'
      }
    });
  } catch (error) {
    console.error('Error adding default data:', error);
    res.status(500).json({ error: 'Server error adding default data' });
  }
});

// Refresh token with updated user data
router.post('/refresh-token', verifyToken, async (req, res) => {
  try {
    // Get latest user data from database
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, is_teacher, is_admin FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Generate a fresh JWT token with updated data
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        isTeacher: user.is_teacher,
        isAdmin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Send success response with new token
    res.status(200).json({
      message: 'Token refreshed successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isTeacher: user.is_teacher,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Server error refreshing token' });
  }
});

module.exports = router; 