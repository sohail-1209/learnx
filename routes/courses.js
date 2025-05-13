/**
 * LearnX - Courses Routes
 * Handles course creation, enrollment, and browsing
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken, isTeacher } = require('../middleware/auth');

// Create a new course
router.post('/', verifyToken, isTeacher, async (req, res) => {
  try {
    const { title, description, category, price, imageUrl, duration, level, tags } = req.body;
    
    // Validate input
    if (!title || !description || !category || !price) {
      return res.status(400).json({ error: 'Title, description, category, and price are required' });
    }
    
    // Create course
    const result = await pool.query(
      `INSERT INTO courses 
       (teacher_id, title, description, category, price, image_url, duration, level, tags, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, is_published`,
      [req.userId, title, description, category, price, imageUrl, duration, level, tags, false]
    );
    
    res.status(201).json({
      message: 'Course created successfully',
      course: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Server error creating course' });
  }
});

// Get all published courses
router.get('/', async (req, res) => {
  try {
    // Apply filters if provided
    const { category, priceMin, priceMax, teacherId, searchQuery, sort } = req.query;
    
    let query = `
      SELECT c.id, c.title, c.description, c.category, c.price, c.image_url, 
             c.level, c.avg_rating, c.total_students, c.created_at,
             u.id as teacher_id, u.first_name, u.last_name, u.profile_pic
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE c.is_published = TRUE
    `;
    
    const queryParams = [];
    let paramCounter = 1;
    
    if (category) {
      query += ` AND c.category = $${paramCounter}`;
      queryParams.push(category);
      paramCounter++;
    }
    
    if (priceMin) {
      query += ` AND c.price >= $${paramCounter}`;
      queryParams.push(parseFloat(priceMin));
      paramCounter++;
    }
    
    if (priceMax) {
      query += ` AND c.price <= $${paramCounter}`;
      queryParams.push(parseFloat(priceMax));
      paramCounter++;
    }
    
    if (teacherId) {
      query += ` AND c.teacher_id = $${paramCounter}`;
      queryParams.push(teacherId);
      paramCounter++;
    }
    
    if (searchQuery) {
      query += ` AND (c.title ILIKE $${paramCounter} OR c.description ILIKE $${paramCounter})`;
      queryParams.push(`%${searchQuery}%`);
      paramCounter++;
    }
    
    // Add sorting options
    switch (sort) {
      case 'price_low':
        query += ' ORDER BY c.price ASC';
        break;
      case 'price_high':
        query += ' ORDER BY c.price DESC';
        break;
      case 'rating':
        query += ' ORDER BY c.avg_rating DESC';
        break;
      case 'popularity':
        query += ' ORDER BY c.total_students DESC';
        break;
      case 'newest':
        query += ' ORDER BY c.created_at DESC';
        break;
      default:
        query += ' ORDER BY c.created_at DESC';
    }
    
    const result = await pool.query(query, queryParams);
    
    const courses = result.rows.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      price: parseFloat(course.price),
      imageUrl: course.image_url,
      level: course.level,
      avgRating: parseFloat(course.avg_rating),
      totalStudents: course.total_students,
      createdAt: course.created_at,
      teacher: {
        id: course.teacher_id,
        name: `${course.first_name} ${course.last_name}`,
        profilePic: course.profile_pic
      }
    }));
    
    res.status(200).json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Server error fetching courses' });
  }
});

// Get a single course by ID
router.get('/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    
    const result = await pool.query(
      `SELECT c.id, c.title, c.description, c.category, c.price, c.image_url, 
              c.level, c.duration, c.tags, c.avg_rating, c.total_students, c.created_at,
              u.id as teacher_id, u.first_name, u.last_name, u.profile_pic, u.bio
       FROM courses c
       JOIN users u ON c.teacher_id = u.id
       WHERE c.id = $1`,
      [courseId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const course = result.rows[0];
    
    // Get upcoming sessions for this course
    const now = new Date();
    const sessionsResult = await pool.query(
      `SELECT id, title, description, start_time, end_time, price, current_students, max_students
       FROM sessions
       WHERE course_id = $1 AND start_time > $2 AND is_cancelled = FALSE
       ORDER BY start_time ASC
       LIMIT 5`,
      [courseId, now]
    );
    
    // Get reviews for this course
    const reviewsResult = await pool.query(
      `SELECT r.rating, r.comment, r.created_at,
              u.first_name, u.last_name, u.profile_pic
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.item_type = 'course' AND r.item_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [courseId]
    );
    
    // Check if user is enrolled (if authenticated)
    let isEnrolled = false;
    if (req.userId) {
      const enrollmentCheck = await pool.query(
        'SELECT id FROM enrollments WHERE course_id = $1 AND user_id = $2',
        [courseId, req.userId]
      );
      
      isEnrolled = enrollmentCheck.rows.length > 0;
    }
    
    res.status(200).json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        price: parseFloat(course.price),
        imageUrl: course.image_url,
        level: course.level,
        duration: course.duration,
        tags: course.tags,
        avgRating: parseFloat(course.avg_rating),
        totalStudents: course.total_students,
        createdAt: course.created_at,
        teacher: {
          id: course.teacher_id,
          name: `${course.first_name} ${course.last_name}`,
          profilePic: course.profile_pic,
          bio: course.bio
        }
      },
      sessions: sessionsResult.rows,
      reviews: reviewsResult.rows.map(review => ({
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        reviewer: {
          name: `${review.first_name} ${review.last_name}`,
          profilePic: review.profile_pic
        }
      })),
      isEnrolled
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Server error fetching course' });
  }
});

// Update a course
router.put('/:id', verifyToken, isTeacher, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { title, description, category, price, imageUrl, duration, level, tags, isPublished } = req.body;
    
    // Check if course exists and belongs to the teacher
    const courseCheck = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
      [courseId, req.userId]
    );
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or does not belong to this teacher' });
    }
    
    // Update course
    await pool.query(
      `UPDATE courses 
       SET title = $1, description = $2, category = $3, price = $4, image_url = $5,
           duration = $6, level = $7, tags = $8, is_published = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [title, description, category, price, imageUrl, duration, level, tags, isPublished, courseId]
    );
    
    res.status(200).json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Server error updating course' });
  }
});

// Enroll in a course
router.post('/:id/enroll', verifyToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Check if course exists
    const courseCheck = await pool.query(
      'SELECT id, price, teacher_id, title FROM courses WHERE id = $1 AND is_published = TRUE',
      [courseId]
    );
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or not published' });
    }
    
    const course = courseCheck.rows[0];
    
    // Check if user is already enrolled
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE course_id = $1 AND user_id = $2',
      [courseId, req.userId]
    );
    
    if (enrollmentCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You are already enrolled in this course' });
    }
    
    // Check if user is trying to enroll in their own course
    if (course.teacher_id === req.userId) {
      return res.status(400).json({ error: 'You cannot enroll in your own course' });
    }
    
    // Check if user has enough balance
    const walletCheck = await pool.query(
      'SELECT balance FROM wallet WHERE user_id = $1',
      [req.userId]
    );
    
    if (walletCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Wallet not found' });
    }
    
    const balance = parseFloat(walletCheck.rows[0].balance);
    const coursePrice = parseFloat(course.price);
    
    if (balance < coursePrice) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create enrollment
      await client.query(
        `INSERT INTO enrollments (user_id, course_id, enrolled_at, last_accessed)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [req.userId, courseId]
      );
      
      // Update course total students
      await client.query(
        `UPDATE courses 
         SET total_students = total_students + 1
         WHERE id = $1`,
        [courseId]
      );
      
      // Update user's wallet balance
      await client.query(
        `UPDATE wallet 
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [coursePrice, req.userId]
      );
      
      // Add transaction record
      await client.query(
        `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
         SELECT w.id, $1, 'payment', $2, $3
         FROM wallet w
         WHERE w.user_id = $4`,
        [coursePrice, `Payment for course: ${course.title}`, courseId, req.userId]
      );
      
      // Add credit to teacher's wallet
      await client.query(
        `UPDATE wallet 
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [coursePrice, course.teacher_id]
      );
      
      // Add transaction record for teacher
      await client.query(
        `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
         SELECT w.id, $1, 'earning', $2, $3
         FROM wallet w
         WHERE w.user_id = $4`,
        [coursePrice, `Earning from course enrollment: ${course.title}`, courseId, course.teacher_id]
      );
      
      // Create notification for the teacher
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES ($1, 'New enrollment', $2, 'enrollment', $3)`,
        [
          course.teacher_id,
          `A new student has enrolled in your course: ${course.title}`,
          courseId
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(200).json({ message: 'Successfully enrolled in course' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: 'Server error enrolling in course' });
  }
});

// Get my courses (enrolled or teaching)
router.get('/my/courses', verifyToken, async (req, res) => {
  try {
    // Check if user is a teacher
    const userCheck = await pool.query('SELECT is_teacher FROM users WHERE id = $1', [req.userId]);
    const isTeacher = userCheck.rows[0].is_teacher;
    
    let teachingCourses = [];
    let enrolledCourses = [];
    
    // Get courses the user is teaching
    if (isTeacher) {
      const teachingResult = await pool.query(
        `SELECT id, title, description, category, price, image_url, level, 
                avg_rating, total_students, is_published, created_at
         FROM courses
         WHERE teacher_id = $1
         ORDER BY created_at DESC`,
        [req.userId]
      );
      
      teachingCourses = teachingResult.rows.map(course => ({
        ...course,
        price: parseFloat(course.price),
        avgRating: parseFloat(course.avg_rating)
      }));
    }
    
    // Get courses the user is enrolled in
    const enrolledResult = await pool.query(
      `SELECT c.id, c.title, c.description, c.category, c.image_url, 
              c.level, e.progress, e.last_accessed, e.completed,
              u.first_name, u.last_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON c.teacher_id = u.id
       WHERE e.user_id = $1
       ORDER BY e.last_accessed DESC`,
      [req.userId]
    );
    
    enrolledCourses = enrolledResult.rows.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      imageUrl: course.image_url,
      level: course.level,
      progress: course.progress,
      lastAccessed: course.last_accessed,
      completed: course.completed,
      teacher: `${course.first_name} ${course.last_name}`
    }));
    
    res.status(200).json({
      teaching: teachingCourses,
      enrolled: enrolledCourses
    });
  } catch (error) {
    console.error('Error fetching user courses:', error);
    res.status(500).json({ error: 'Server error fetching user courses' });
  }
});

// Update course progress for enrolled user
router.put('/:id/progress', verifyToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { progress, completed } = req.body;
    
    // Check if user is enrolled in the course
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE course_id = $1 AND user_id = $2',
      [courseId, req.userId]
    );
    
    if (enrollmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    // Update enrollment
    await pool.query(
      `UPDATE enrollments 
       SET progress = $1, completed = $2, last_accessed = CURRENT_TIMESTAMP
       WHERE course_id = $3 AND user_id = $4`,
      [progress, completed, courseId, req.userId]
    );
    
    res.status(200).json({ message: 'Progress updated successfully' });
  } catch (error) {
    console.error('Error updating course progress:', error);
    res.status(500).json({ error: 'Server error updating course progress' });
  }
});

module.exports = router; 