/**
 * LearnX - Admin Routes
 * Handles admin dashboard and user management
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken, isAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Get admin dashboard statistics
router.get('/dashboard', verifyToken, isAdmin, async (req, res) => {
  try {
    // Get user statistics
    const userStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_teacher = TRUE THEN 1 ELSE 0 END) as teacher_count,
        SUM(CASE WHEN is_admin = TRUE THEN 1 ELSE 0 END) as admin_count,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month
      FROM users
    `);
    
    // Get course statistics
    const courseStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_courses,
        SUM(CASE WHEN is_published = TRUE THEN 1 ELSE 0 END) as published_courses,
        AVG(avg_rating) as avg_course_rating,
        SUM(total_students) as total_enrollments,
        (SELECT COUNT(*) FROM courses WHERE created_at > NOW() - INTERVAL '30 days') as new_courses_month
      FROM courses
    `);
    
    // Get session statistics
    const sessionStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN start_time > NOW() THEN 1 ELSE 0 END) as upcoming_sessions,
        SUM(CASE WHEN start_time <= NOW() THEN 1 ELSE 0 END) as past_sessions,
        SUM(CASE WHEN is_cancelled = TRUE THEN 1 ELSE 0 END) as cancelled_sessions,
        SUM(current_students) as total_bookings
      FROM sessions
    `);
    
    // Get financial statistics
    const financialStatsResult = await pool.query(`
      SELECT 
        SUM(amount) as total_transactions,
        (SELECT SUM(amount) FROM transactions WHERE type = 'deposit') as total_deposits,
        (SELECT SUM(amount) FROM transactions WHERE type = 'withdrawal') as total_withdrawals,
        (SELECT SUM(amount) FROM transactions WHERE type = 'payment') as total_payments,
        (SELECT SUM(amount) FROM transactions WHERE created_at > NOW() - INTERVAL '30 days') as transactions_month
      FROM transactions
    `);
    
    // Get monthly revenue data
    const monthlyRevenueResult = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as revenue
      FROM transactions
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `);
    
    // Get most popular courses
    const popularCoursesResult = await pool.query(`
      SELECT 
        c.id, c.title, c.category, c.price, c.total_students, c.avg_rating,
        u.first_name, u.last_name
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE c.is_published = TRUE
      ORDER BY c.total_students DESC
      LIMIT 5
    `);
    
    // Get most active teachers
    const activeTeachersResult = await pool.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.profile_pic,
        COUNT(c.id) as course_count,
        COUNT(s.id) as session_count,
        SUM(c.total_students) as total_students
      FROM users u
      LEFT JOIN courses c ON u.id = c.teacher_id
      LEFT JOIN sessions s ON u.id = s.teacher_id
      WHERE u.is_teacher = TRUE
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_pic
      ORDER BY SUM(c.total_students) DESC NULLS LAST
      LIMIT 5
    `);
    
    res.status(200).json({
      users: {
        total: parseInt(userStatsResult.rows[0].total_users),
        teachers: parseInt(userStatsResult.rows[0].teacher_count),
        admins: parseInt(userStatsResult.rows[0].admin_count),
        newUsersWeek: parseInt(userStatsResult.rows[0].new_users_week),
        newUsersMonth: parseInt(userStatsResult.rows[0].new_users_month)
      },
      courses: {
        total: parseInt(courseStatsResult.rows[0].total_courses),
        published: parseInt(courseStatsResult.rows[0].published_courses),
        avgRating: parseFloat(courseStatsResult.rows[0].avg_course_rating || 0),
        totalEnrollments: parseInt(courseStatsResult.rows[0].total_enrollments || 0),
        newCoursesMonth: parseInt(courseStatsResult.rows[0].new_courses_month)
      },
      sessions: {
        total: parseInt(sessionStatsResult.rows[0].total_sessions),
        upcoming: parseInt(sessionStatsResult.rows[0].upcoming_sessions),
        past: parseInt(sessionStatsResult.rows[0].past_sessions),
        cancelled: parseInt(sessionStatsResult.rows[0].cancelled_sessions),
        totalBookings: parseInt(sessionStatsResult.rows[0].total_bookings || 0)
      },
      finances: {
        totalTransactions: parseFloat(financialStatsResult.rows[0].total_transactions || 0),
        deposits: parseFloat(financialStatsResult.rows[0].total_deposits || 0),
        withdrawals: parseFloat(financialStatsResult.rows[0].total_withdrawals || 0),
        payments: parseFloat(financialStatsResult.rows[0].total_payments || 0),
        transactionsMonth: parseFloat(financialStatsResult.rows[0].transactions_month || 0)
      },
      monthlyRevenue: monthlyRevenueResult.rows.map(row => ({
        month: row.month,
        revenue: parseFloat(row.revenue || 0)
      })),
      popularCourses: popularCoursesResult.rows.map(course => ({
        id: course.id,
        title: course.title,
        category: course.category,
        price: parseFloat(course.price),
        totalStudents: course.total_students,
        avgRating: parseFloat(course.avg_rating || 0),
        teacher: `${course.first_name} ${course.last_name}`
      })),
      activeTeachers: activeTeachersResult.rows.map(teacher => ({
        id: teacher.id,
        name: `${teacher.first_name} ${teacher.last_name}`,
        email: teacher.email,
        profilePic: teacher.profile_pic,
        courseCount: parseInt(teacher.course_count || 0),
        sessionCount: parseInt(teacher.session_count || 0),
        totalStudents: parseInt(teacher.total_students || 0)
      }))
    });
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    res.status(500).json({ error: 'Server error fetching admin dashboard data' });
  }
});

// Get all users (admin only)
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, email, first_name, last_name, profile_pic, is_teacher, is_admin, created_at
      FROM users
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (role === 'teacher') {
      query += ' AND is_teacher = TRUE';
    } else if (role === 'admin') {
      query += ' AND is_admin = TRUE';
    } else if (role === 'student') {
      query += ' AND is_teacher = FALSE AND is_admin = FALSE';
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    const usersResult = await pool.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;
    
    if (search) {
      countQuery += ` AND (email ILIKE $${countParamIndex} OR first_name ILIKE $${countParamIndex} OR last_name ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    
    if (role === 'teacher') {
      countQuery += ' AND is_teacher = TRUE';
    } else if (role === 'admin') {
      countQuery += ' AND is_admin = TRUE';
    } else if (role === 'student') {
      countQuery += ' AND is_teacher = FALSE AND is_admin = FALSE';
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    res.status(200).json({
      users: usersResult.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePic: user.profile_pic,
        isTeacher: user.is_teacher,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      })),
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Update user roles (admin only)
router.put('/users/:id/roles', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isTeacher, isAdmin } = req.body;
    
    // Prevent self-demotion from admin
    if (userId == req.userId && isAdmin === false) {
      return res.status(403).json({ error: 'Admins cannot remove their own admin status' });
    }
    
    // Update user roles
    await pool.query(
      `UPDATE users 
       SET is_teacher = $1, is_admin = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [isTeacher, isAdmin, userId]
    );
    
    res.status(200).json({
      message: 'User roles updated successfully',
      user: {
        id: userId,
        isTeacher,
        isAdmin
      }
    });
  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Server error updating user roles' });
  }
});

// Create a new user (admin only)
router.post('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, isTeacher, isAdmin } = req.body;
    
    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if email is already in use
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert new user
      const newUser = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, is_teacher, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, is_teacher, is_admin, created_at`,
        [email, hashedPassword, firstName, lastName, isTeacher || false, isAdmin || false]
      );
      
      // Create user profile
      await client.query(
        'INSERT INTO user_profile (user_id) VALUES ($1)',
        [newUser.rows[0].id]
      );
      
      // Create wallet for the user
      await client.query(
        'INSERT INTO wallet (user_id) VALUES ($1)',
        [newUser.rows[0].id]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: newUser.rows[0].id,
          email: newUser.rows[0].email,
          firstName: newUser.rows[0].first_name,
          lastName: newUser.rows[0].last_name,
          isTeacher: newUser.rows[0].is_teacher,
          isAdmin: newUser.rows[0].is_admin,
          createdAt: newUser.rows[0].created_at
        }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Server error creating user' });
  }
});

// Get user details (admin only)
router.get('/users/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get basic user info
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.profile_pic, u.bio, 
              u.is_teacher, u.is_admin, u.created_at,
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
    
    // Get wallet details
    const walletResult = await pool.query(
      'SELECT balance FROM wallet WHERE user_id = $1',
      [userId]
    );
    
    // Get course count
    const courseCountResult = await pool.query(
      'SELECT COUNT(*) FROM courses WHERE teacher_id = $1',
      [userId]
    );
    
    // Get enrollments count
    const enrollmentsCountResult = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE user_id = $1',
      [userId]
    );
    
    // Get recent activity
    const recentActivityResult = await pool.query(`
      SELECT
        'course_created' as type,
        id as reference_id,
        title as description,
        created_at
      FROM courses
      WHERE teacher_id = $1
      
      UNION ALL
      
      SELECT
        'enrollment' as type,
        e.id as reference_id,
        c.title as description,
        e.enrolled_at as created_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1
      
      UNION ALL
      
      SELECT
        'booking' as type,
        b.id as reference_id,
        s.title as description,
        b.booked_at as created_at
      FROM bookings b
      JOIN sessions s ON b.session_id = s.id
      WHERE b.user_id = $1
      
      UNION ALL
      
      SELECT
        'transaction' as type,
        id as reference_id,
        description,
        created_at
      FROM transactions
      WHERE wallet_id = (SELECT id FROM wallet WHERE user_id = $1)
      
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);
    
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePic: user.profile_pic,
        bio: user.bio,
        isTeacher: user.is_teacher,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
        profile: {
          headline: user.headline,
          skills: user.skills,
          education: user.education,
          experience: user.experience,
          languages: user.languages,
          website: user.website
        }
      },
      wallet: {
        balance: parseFloat(walletResult.rows[0]?.balance || 0)
      },
      stats: {
        courseCount: parseInt(courseCountResult.rows[0].count),
        enrollmentsCount: parseInt(enrollmentsCountResult.rows[0].count)
      },
      recentActivity: recentActivityResult.rows
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Server error fetching user details' });
  }
});

// System settings routes
router.get('/settings', verifyToken, isAdmin, async (req, res) => {
  try {
    // In a real application, this would fetch settings from the database
    // For demo purposes, we'll return mock settings
    res.status(200).json({
      settings: {
        general: {
          siteName: 'LearnX',
          siteDescription: 'Learn from experts, anywhere, anytime',
          supportEmail: 'support@learnx.com',
          maintenanceMode: false
        },
        security: {
          allowSignups: true,
          requireEmailVerification: false,
          sessionTimeout: 86400, // 24 hours in seconds
          maxLoginAttempts: 5
        },
        payments: {
          currency: 'USD',
          platformFee: 10, // 10%
          minWithdrawalAmount: 50,
          payoutSchedule: 'weekly'
        },
        features: {
          enableChat: true,
          enableReviews: true,
          enablePublicProfiles: true,
          maxFileUploadSize: 5242880 // 5MB
        }
      }
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Server error fetching system settings' });
  }
});

// Update system settings (admin only)
router.put('/settings', verifyToken, isAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    
    // In a real application, this would update settings in the database
    // For demo purposes, we'll just return success
    res.status(200).json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Server error updating system settings' });
  }
});

module.exports = router; 