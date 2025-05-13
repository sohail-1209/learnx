/**
 * LearnX - User Routes
 * Handles user profile management and user data retrieval
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get user profile
router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.profile_pic, u.bio, u.is_teacher, u.created_at,
       p.headline, p.skills, p.education, p.experience, p.languages, p.website
       FROM users u
       LEFT JOIN user_profile p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    console.log("Retrieved user with profile_pic:", user.profile_pic);
    
    // Get user courses if they are a teacher
    let courses = [];
    if (user.is_teacher) {
      const coursesResult = await pool.query(
        `SELECT id, title, description, category, price, image_url, level, avg_rating, total_students
         FROM courses 
         WHERE teacher_id = $1 AND is_published = TRUE
         ORDER BY created_at DESC`,
        [userId]
      );
      
      courses = coursesResult.rows;
    }
    
    // Get upcoming sessions taught by this user
    let upcomingSessions = [];
    if (user.is_teacher) {
      const now = new Date();
      const sessionsResult = await pool.query(
        `SELECT id, title, description, start_time, end_time, price, current_students, max_students
         FROM sessions
         WHERE teacher_id = $1 AND start_time > $2 AND is_cancelled = FALSE
         ORDER BY start_time ASC`,
        [userId, now]
      );
      
      upcomingSessions = sessionsResult.rows;
    }
    
    // Get reviews for this user's teaching
    let reviews = [];
    if (user.is_teacher) {
      const reviewsResult = await pool.query(
        `SELECT r.id, r.rating, r.comment, r.created_at, 
         u.first_name, u.last_name, u.profile_pic
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.item_type = 'teacher' AND r.item_id = $1
         ORDER BY r.created_at DESC
         LIMIT 10`,
        [userId]
      );
      
      reviews = reviewsResult.rows;
    }
    
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePic: user.profile_pic,
        bio: user.bio,
        isTeacher: user.is_teacher,
        createdAt: user.created_at,
        headline: user.headline,
        skills: user.skills,
        education: user.education,
        experience: user.experience,
        languages: user.languages,
        website: user.website
      },
      courses,
      upcomingSessions,
      reviews
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    let { firstName, lastName, bio, profilePic, headline, skills, education, experience, languages, website } = req.body;
    
    // Function to safely truncate potentially long strings
    const truncate = (str, maxLength) => {
      if (str && typeof str === 'string' && str.length > maxLength) {
        console.log(`Truncating value that exceeds ${maxLength} chars`);
        return str.substring(0, maxLength);
      }
      return str;
    };
    
    // Handle profile image - convert to file if it's a base64 data URL
    let profilePicUrl = null;
    if (profilePic && profilePic.startsWith('data:image')) {
      try {
        // Check size limits - PostgreSQL text fields have practical limits
        const estimatedBytes = profilePic.length;
        console.log(`Received image size: ${Math.round(estimatedBytes/1024)}KB`);
        
        // If the image is too large (>500KB), reject it
        if (estimatedBytes > 500000) {
          console.warn("Image too large for database storage");
          return res.status(400).json({ 
            error: 'Profile image too large. Please use a smaller image or lower quality.',
            maxSize: '500KB' 
          });
        }
        
        // Image is within acceptable size limits
        profilePicUrl = profilePic;
        console.log("Saved uploaded profile image data URL");
      } catch (imgError) {
        console.error("Error processing profile image:", imgError);
        // Fall back to default avatar - as SVG data URL
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="#00BFA6"/>
          <text x="50" y="50" font-family="Arial" font-size="40" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">U</text>
        </svg>`;
        profilePicUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      }
    } else if (profilePic && profilePic.startsWith('https://ui-avatars.com')) {
      // Accept UI avatar URLs
      profilePicUrl = profilePic;
      console.log("Using UI Avatars service");
    } else if (profilePic) {
      // If it's already a URL, keep it
      profilePicUrl = profilePic;
    }
    
    // Truncate string values to match database column sizes
    headline = truncate(headline, 250);
    website = truncate(website, 250);
    
    // Validate and format JSON fields
    const validateJsonField = (field) => {
      if (field === null || field === undefined) return null;
      
      // If it's already a valid object/array, stringify it
      if (typeof field === 'object') {
        return JSON.stringify(field);
      }
      
      // If it's a string that looks like JSON, validate it
      if (typeof field === 'string') {
        try {
          // Try to parse and then re-stringify to ensure it's valid JSON
          return JSON.stringify(JSON.parse(field));
        } catch (e) {
          // If it's not valid JSON and just a string, make it a simple object
          console.log(`Invalid JSON format for field, converting to simple object`);
          return JSON.stringify([{ value: field }]);
        }
      }
      
      // Default fallback - create empty array
      return '[]';
    };
    
    // Process education and experience fields to ensure they're valid JSON
    education = validateJsonField(education);
    experience = validateJsonField(experience);
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Only update basic user info if any of those fields are provided
      if (firstName !== undefined || lastName !== undefined || bio !== undefined || profilePicUrl !== undefined) {
        // Get current user data
        const userResult = await client.query(
          'SELECT first_name, last_name, bio, profile_pic FROM users WHERE id = $1',
          [req.userId]
        );
        
        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }
        
        const currentUser = userResult.rows[0];
        
        // Ensure first_name and last_name are never null as they are NOT NULL in the database
        const newFirstName = firstName !== undefined ? (firstName || currentUser.first_name) : currentUser.first_name;
        const newLastName = lastName !== undefined ? (lastName || currentUser.last_name) : currentUser.last_name;
        
        if (!newFirstName || !newLastName) {
          return res.status(400).json({ error: 'First name and last name cannot be empty' });
        }
        
        // Update with new values or keep existing ones
        await client.query(
          `UPDATE users 
           SET first_name = $1, last_name = $2, bio = $3, profile_pic = $4, updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [
            newFirstName,
            newLastName,
            bio !== undefined ? bio : currentUser.bio,
            profilePicUrl !== null ? profilePicUrl : currentUser.profile_pic,
            req.userId
          ]
        );
      }
      
      // Only update profile if any profile fields are provided
      if (headline !== undefined || skills !== undefined || education !== undefined || 
          experience !== undefined || languages !== undefined || website !== undefined) {
        
        // Get current profile data
        const profileResult = await client.query(
          'SELECT headline, skills, education, experience, languages, website FROM user_profile WHERE user_id = $1',
          [req.userId]
        );
        
        // If profile exists, use current values; otherwise use defaults
        const currentProfile = profileResult.rows[0] || {
          headline: null,
          skills: [],
          education: null,
          experience: null,
          languages: null,
          website: null
        };
        
        // Ensure skills is always an array
        let newSkills = skills;
        if (skills !== undefined) {
          if (!Array.isArray(skills)) {
            // Convert to array if it's not already
            newSkills = skills ? [skills] : [];
          }
          // Truncate each skill
          newSkills = newSkills.map(skill => truncate(skill, 100));
        } else {
          newSkills = currentProfile.skills;
        }
        
        // Update profile with new values or keep existing ones
        await client.query(
          `INSERT INTO user_profile (user_id, headline, skills, education, experience, languages, website, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) 
           DO UPDATE SET 
             headline = $2,
             skills = $3,
             education = $4::jsonb,
             experience = $5::jsonb,
             languages = $6,
             website = $7,
             updated_at = CURRENT_TIMESTAMP`,
          [
            req.userId,
            headline !== undefined ? headline : currentProfile.headline,
            newSkills,
            education !== undefined ? education : currentProfile.education,
            experience !== undefined ? experience : currentProfile.experience,
            languages !== undefined ? languages : currentProfile.languages,
            website !== undefined ? website : currentProfile.website
          ]
        );
      }
      
      await client.query('COMMIT');
      res.status(200).json({ message: 'Profile updated successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      
      // Send more descriptive error messages
      if (e.code === '22001') {
        return res.status(400).json({ error: 'Value too long for database field. Please shorten your input.' });
      } else if (e.code === '23502') {
        return res.status(400).json({ error: 'Required field cannot be empty.' });
      } else if (e.code === '22P02') {
        return res.status(400).json({ error: 'Invalid format for JSON field. Please check education and experience fields.' });
      }
      
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: error.message || 'Server error updating user profile' });
  }
});

// Become a teacher
router.post('/become-teacher', verifyToken, async (req, res) => {
  try {
    // Check if already a teacher
    const userCheck = await pool.query('SELECT is_teacher FROM users WHERE id = $1', [req.userId]);
    
    if (userCheck.rows[0].is_teacher) {
      return res.status(400).json({ error: 'User is already a teacher' });
    }
    
    // Update user to be a teacher
    await pool.query(
      'UPDATE users SET is_teacher = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.userId]
    );
    
    res.status(200).json({ message: 'Successfully became a teacher' });
  } catch (error) {
    console.error('Error becoming a teacher:', error);
    res.status(500).json({ error: 'Server error processing teacher request' });
  }
});

// Get user dashboard data
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Get basic user info
    const userResult = await pool.query(
      `SELECT first_name, last_name, profile_pic, is_teacher
       FROM users WHERE id = $1`,
      [req.userId]
    );
    
    const user = userResult.rows[0];
    
    // Get wallet balance
    const walletResult = await pool.query(
      'SELECT balance FROM wallet WHERE user_id = $1',
      [req.userId]
    );
    
    let walletBalance = 0;
    if (walletResult.rows.length > 0) {
      walletBalance = parseFloat(walletResult.rows[0].balance);
    }
    
    // Get todos
    const todosResult = await pool.query(
      `SELECT id, title, due_date, priority, is_completed
       FROM todos
       WHERE user_id = $1
       ORDER BY due_date ASC, priority DESC
       LIMIT 5`,
      [req.userId]
    );
    
    // Get enrolled courses or teaching courses
    let courses = [];
    if (user.is_teacher) {
      const coursesResult = await pool.query(
        `SELECT id, title, avg_rating, total_students
         FROM courses
         WHERE teacher_id = $1
         ORDER BY total_students DESC
         LIMIT 5`,
        [req.userId]
      );
      
      courses = coursesResult.rows;
    } else {
      const enrollmentsResult = await pool.query(
        `SELECT c.id, c.title, c.image_url, e.progress, e.last_accessed
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE e.user_id = $1
         ORDER BY e.last_accessed DESC
         LIMIT 5`,
        [req.userId]
      );
      
      courses = enrollmentsResult.rows;
    }
    
    // Get upcoming sessions (booked or teaching)
    const now = new Date();
    let upcomingSessions = [];
    
    if (user.is_teacher) {
      const sessionsResult = await pool.query(
        `SELECT id, title, start_time, end_time, current_students, max_students
         FROM sessions
         WHERE teacher_id = $1 AND start_time > $2 AND is_cancelled = FALSE
         ORDER BY start_time ASC
         LIMIT 5`,
        [req.userId, now]
      );
      
      upcomingSessions = sessionsResult.rows;
    } else {
      const bookingsResult = await pool.query(
        `SELECT s.id, s.title, s.start_time, s.end_time, u.first_name, u.last_name
         FROM bookings b
         JOIN sessions s ON b.session_id = s.id
         JOIN users u ON s.teacher_id = u.id
         WHERE b.user_id = $1 AND s.start_time > $2 AND b.status = 'confirmed'
         ORDER BY s.start_time ASC
         LIMIT 5`,
        [req.userId, now]
      );
      
      upcomingSessions = bookingsResult.rows.map(session => ({
        ...session,
        instructor: `${session.first_name} ${session.last_name}` 
      }));
    }
    
    // Get notifications
    const notificationsResult = await pool.query(
      `SELECT id, title, message, type, created_at, is_read
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [req.userId]
    );
    
    // Get recent activity
    let recentActivity = [];
    
    // Get recent messages
    const messagesResult = await pool.query(
      `SELECT m.id, m.content, m.sent_at, u.first_name, u.last_name, u.profile_pic
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.receiver_id = $1 AND m.is_read = FALSE
       ORDER BY m.sent_at DESC
       LIMIT 3`,
      [req.userId]
    );
    
    recentActivity = [
      ...recentActivity,
      ...messagesResult.rows.map(msg => ({
        type: 'message',
        id: msg.id,
        content: msg.content,
        timestamp: msg.sent_at,
        sender: `${msg.first_name} ${msg.last_name}`,
        senderPic: msg.profile_pic
      }))
    ];
    
    res.status(200).json({
      user: {
        firstName: user.first_name,
        lastName: user.last_name,
        profilePic: user.profile_pic,
        isTeacher: user.is_teacher
      },
      walletBalance,
      todos: todosResult.rows,
      courses,
      upcomingSessions,
      notifications: notificationsResult.rows,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Server error fetching dashboard data' });
  }
});

// Get all users (admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const usersResult = await pool.query(
      `SELECT id, email, first_name, last_name, profile_pic, is_teacher, is_admin, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    
    res.status(200).json({ users: usersResult.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

module.exports = router; 