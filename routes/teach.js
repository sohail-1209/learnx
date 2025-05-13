/**
 * LearnX - Teaching Routes
 * Handles teacher profiles, sessions, and related data
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken, isTeacher } = require('../middleware/auth');

// Get teacher profile
router.get('/:id', async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    // Check if the user exists and is a teacher
    const teacherResult = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.profile_pic, u.bio, u.created_at,
       p.headline, p.skills, p.education, p.experience, p.languages, p.website
       FROM users u
       LEFT JOIN user_profile p ON u.id = p.user_id
       WHERE u.id = $1 AND u.is_teacher = TRUE`,
      [teacherId]
    );
    
    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    const teacher = teacherResult.rows[0];
    
    // Get teacher's courses
    const coursesResult = await pool.query(
      `SELECT id, title, description, category, price, image_url, level, avg_rating, total_students
       FROM courses 
       WHERE teacher_id = $1 AND is_published = TRUE
       ORDER BY created_at DESC`,
      [teacherId]
    );
    
    // Get upcoming sessions for this teacher
    const now = new Date();
    const sessionsResult = await pool.query(
      `SELECT s.id, s.title, s.description, s.start_time, s.end_time, s.price, s.current_students, s.max_students, s.category, c.category as course_category
       FROM sessions s
       LEFT JOIN courses c ON s.course_id = c.id
       WHERE s.teacher_id = $1 AND s.is_cancelled = FALSE
       ORDER BY s.start_time ASC`,
      [teacherId]
    );
    
    // Get completed sessions count
    const completedSessionsResult = await pool.query(
      `SELECT COUNT(*) FROM sessions 
       WHERE teacher_id = $1 AND end_time < $2 AND is_cancelled = FALSE`,
      [teacherId, now]
    );
    
    // Get active student count (students who have booked or attended this teacher's sessions)
    const studentsResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) FROM bookings 
       WHERE session_id IN (SELECT id FROM sessions WHERE teacher_id = $1)`,
      [teacherId]
    );
    
    // Get teacher's reviews
    const reviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, 
       u.first_name, u.last_name, u.profile_pic
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.item_type = 'teacher' AND r.item_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [teacherId]
    );
    
    // Calculate average rating
    let avgRating = 0;
    if (reviewsResult.rows.length > 0) {
      avgRating = reviewsResult.rows.reduce((sum, review) => sum + review.rating, 0) / reviewsResult.rows.length;
    }
    
    // Format the response
    const response = {
      username: `${teacher.first_name} ${teacher.last_name}`,
      profile_picture_url: teacher.profile_pic,
      profile: {
        title: teacher.headline || 'Teacher at LearnX',
        description: teacher.bio || 'No bio available.',
        experience_years: '1+', // Default value
        hourly_rate: teacher.hourly_rate || '45.00',
        sessions_completed: parseInt(completedSessionsResult.rows[0].count) || 0,
        students_taught: parseInt(studentsResult.rows[0].count) || 0,
        rating: avgRating,
        reviews: reviewsResult.rows.length
      },
      skills: teacher.skills || [],
      education: [],
      experience: [],
      languages: teacher.languages || ['English'],
      website: teacher.website,
      courses: coursesResult.rows,
      sessions: sessionsResult.rows.map(session => ({
        id: session.id,
        title: session.title,
        description: session.description,
        datetime: session.start_time,
        duration: Math.round((new Date(session.end_time) - new Date(session.start_time)) / (60 * 1000)),
        price: session.price,
        max_students: session.max_students || 10,
        available_spots: session.max_students - session.current_students,
        current_students: session.current_students || 0,
        category: session.category || session.course_category || 'Other'
      }))
    };
    
    // Add debug logging for sessions
    console.log(`Teaching sessions query results for user ${teacherId}:`, {
      sessionsCount: sessionsResult.rows.length,
      sessionIds: sessionsResult.rows.map(s => s.id),
      sessions: sessionsResult.rows
    });
    
    // Safely parse JSON fields
    try {
      if (teacher.education) {
        // Check if education is already an object/array
        if (typeof teacher.education === 'object') {
          response.education = teacher.education;
        } 
        // Check if it's a string that needs parsing
        else if (typeof teacher.education === 'string' && teacher.education.trim()) {
          try {
            response.education = JSON.parse(teacher.education);
          } catch (parseError) {
            console.error('Error parsing education JSON:', parseError);
            response.education = []; // Fallback to empty array
          }
        }
      }
      
      if (teacher.experience) {
        // Check if experience is already an object/array
        if (typeof teacher.experience === 'object') {
          response.experience = teacher.experience;
          
          // Update experience years if experience data exists
          if (Array.isArray(teacher.experience) && teacher.experience.length > 0 && teacher.experience[0].years) {
            response.profile.experience_years = teacher.experience[0].years;
          }
        } 
        // Check if it's a string that needs parsing
        else if (typeof teacher.experience === 'string' && teacher.experience.trim()) {
          try {
            const parsedExperience = JSON.parse(teacher.experience);
            response.experience = parsedExperience;
            
            // Update experience years if experience data exists
            if (parsedExperience && parsedExperience.length > 0 && parsedExperience[0].years) {
              response.profile.experience_years = parsedExperience[0].years;
            }
          } catch (parseError) {
            console.error('Error parsing experience JSON:', parseError);
            response.experience = []; // Fallback to empty array
          }
        }
      }
    } catch (err) {
      console.error('Error processing JSON fields:', err);
      // Continue with default values already set
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({ error: 'Server error fetching teacher profile' });
  }
});

// Get teacher reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    // Get all reviews for this teacher
    const reviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, 
       u.first_name, u.last_name, u.profile_pic,
       s.title as session_title
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN sessions s ON (r.item_type = 'session' AND r.item_id = s.id)
       WHERE (r.item_type = 'teacher' AND r.item_id = $1) OR 
             (r.item_type = 'session' AND r.item_id IN 
                (SELECT id FROM sessions WHERE teacher_id = $1))
       ORDER BY r.created_at DESC`,
      [teacherId]
    );
    
    // Format reviews with safe handling of potentially null fields
    const reviews = reviewsResult.rows.map(review => ({
      id: review.id,
      rating: review.rating || 5,
      comment: review.comment || 'No comment provided',
      created_at: review.created_at || new Date(),
      student_name: review.first_name && review.last_name ? 
        `${review.first_name} ${review.last_name}` : 'Anonymous Student',
      student_picture: review.profile_pic || null,
      session_title: review.session_title || 'Session'
    }));
    
    res.status(200).json({ reviews });
  } catch (error) {
    console.error('Error fetching teacher reviews:', error);
    res.status(500).json({ error: 'Server error fetching teacher reviews' });
  }
});

// Become a teacher
router.post('/become', verifyToken, async (req, res) => {
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
    
    // Initialize empty skills array if profile exists
    await pool.query(
      `INSERT INTO user_profile (user_id, skills, headline) 
       VALUES ($1, ARRAY[]::TEXT[], 'Teacher at LearnX') 
       ON CONFLICT (user_id) 
       DO UPDATE SET skills = COALESCE(user_profile.skills, ARRAY[]::TEXT[])`,
      [req.userId]
    );
    
    res.status(200).json({ message: 'Successfully became a teacher' });
  } catch (error) {
    console.error('Error becoming a teacher:', error);
    res.status(500).json({ error: 'Server error processing teacher request' });
  }
});

module.exports = router; 