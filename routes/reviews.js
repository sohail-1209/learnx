/**
 * LearnX - Reviews Routes
 * Handles reviews for courses, sessions, and teachers
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken } = require('../middleware/auth');

// Submit a review
router.post('/', verifyToken, async (req, res) => {
  try {
    const { itemId, itemType, rating, comment } = req.body;
    
    // Validate input
    if (!itemId || !itemType || !rating) {
      return res.status(400).json({ error: 'Item ID, item type, and rating are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Validate item type
    if (!['course', 'session', 'teacher'].includes(itemType)) {
      return res.status(400).json({ error: 'Invalid item type. Must be course, session, or teacher' });
    }
    
    // Verify that the user has access to review this item
    let canReview = false;
    let ownerId = null;
    
    if (itemType === 'course') {
      // Check if user is enrolled in the course
      const enrollmentCheck = await pool.query(
        'SELECT id FROM enrollments WHERE course_id = $1 AND user_id = $2',
        [itemId, req.userId]
      );
      
      canReview = enrollmentCheck.rows.length > 0;
      
      // Get course owner for notification
      const courseOwnerResult = await pool.query(
        'SELECT teacher_id FROM courses WHERE id = $1',
        [itemId]
      );
      
      if (courseOwnerResult.rows.length > 0) {
        ownerId = courseOwnerResult.rows[0].teacher_id;
      }
    } else if (itemType === 'session') {
      // Check if user has booked this session
      const bookingCheck = await pool.query(
        'SELECT id FROM bookings WHERE session_id = $1 AND user_id = $2',
        [itemId, req.userId]
      );
      
      canReview = bookingCheck.rows.length > 0;
      
      // Get session owner for notification
      const sessionOwnerResult = await pool.query(
        'SELECT teacher_id FROM sessions WHERE id = $1',
        [itemId]
      );
      
      if (sessionOwnerResult.rows.length > 0) {
        ownerId = sessionOwnerResult.rows[0].teacher_id;
      }
    } else if (itemType === 'teacher') {
      // Check if user has booked any session with this teacher
      const bookingCheck = await pool.query(
        `SELECT b.id 
         FROM bookings b
         JOIN sessions s ON b.session_id = s.id
         WHERE s.teacher_id = $1 AND b.user_id = $2
         LIMIT 1`,
        [itemId, req.userId]
      );
      
      canReview = bookingCheck.rows.length > 0;
      ownerId = itemId;
    }
    
    if (!canReview) {
      return res.status(403).json({ error: 'You are not authorized to review this item' });
    }
    
    // Check if user has already reviewed this item
    const existingReviewCheck = await pool.query(
      'SELECT id FROM reviews WHERE item_id = $1 AND item_type = $2 AND user_id = $3',
      [itemId, itemType, req.userId]
    );
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let reviewId;
      
      if (existingReviewCheck.rows.length > 0) {
        // Update existing review
        const updateResult = await client.query(
          `UPDATE reviews 
           SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING id, rating, comment, updated_at`,
          [rating, comment, existingReviewCheck.rows[0].id]
        );
        
        reviewId = updateResult.rows[0].id;
      } else {
        // Create new review
        const insertResult = await client.query(
          `INSERT INTO reviews (user_id, item_id, item_type, rating, comment)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, rating, comment, created_at`,
          [req.userId, itemId, itemType, rating, comment]
        );
        
        reviewId = insertResult.rows[0].id;
      }
      
      // Update average rating
      if (itemType === 'course') {
        // Calculate new average rating
        const avgRatingResult = await client.query(
          `SELECT AVG(rating) as avg_rating FROM reviews WHERE item_id = $1 AND item_type = 'course'`,
          [itemId]
        );
        
        // Update course avg_rating
        await client.query(
          `UPDATE courses SET avg_rating = $1 WHERE id = $2`,
          [avgRatingResult.rows[0].avg_rating, itemId]
        );
      } else if (itemType === 'teacher') {
        // Could implement teacher rating logic here if needed
      }
      
      // Notify the item owner
      if (ownerId) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id)
           VALUES ($1, 'New Review', $2, 'review', $3)`,
          [
            ownerId,
            `You have received a new ${rating}-star review`,
            reviewId
          ]
        );
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({
        message: 'Review submitted successfully',
        review: {
          id: reviewId,
          rating,
          comment,
          itemId,
          itemType
        }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Server error submitting review' });
  }
});

// Get reviews for an item
router.get('/:itemType/:itemId', async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Validate item type
    if (!['course', 'session', 'teacher'].includes(itemType)) {
      return res.status(400).json({ error: 'Invalid item type. Must be course, session, or teacher' });
    }
    
    // Get reviews
    const reviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id as user_id, u.first_name, u.last_name, u.profile_pic
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.item_id = $1 AND r.item_type = $2
       ORDER BY r.created_at DESC
       LIMIT $3 OFFSET $4`,
      [itemId, itemType, limit, offset]
    );
    
    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE item_id = $1 AND item_type = $2',
      [itemId, itemType]
    );
    
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get average rating
    const avgRatingResult = await pool.query(
      'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE item_id = $1 AND item_type = $2',
      [itemId, itemType]
    );
    
    // Get rating distribution
    const distributionResult = await pool.query(
      `SELECT rating, COUNT(*) as count
       FROM reviews 
       WHERE item_id = $1 AND item_type = $2
       GROUP BY rating
       ORDER BY rating DESC`,
      [itemId, itemType]
    );
    
    // Format distribution data
    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    distributionResult.rows.forEach(row => {
      distribution[row.rating] = parseInt(row.count);
    });
    
    res.status(200).json({
      reviews: reviewsResult.rows.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        user: {
          id: review.user_id,
          name: `${review.first_name} ${review.last_name}`,
          profilePic: review.profile_pic
        }
      })),
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      },
      summary: {
        averageRating: parseFloat(avgRatingResult.rows[0].avg || 0),
        reviewCount: parseInt(avgRatingResult.rows[0].count || 0),
        distribution
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Server error fetching reviews' });
  }
});

// Get my reviews
router.get('/my/reviews', verifyToken, async (req, res) => {
  try {
    const reviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.item_id, r.item_type,
              CASE 
                WHEN r.item_type = 'course' THEN c.title
                WHEN r.item_type = 'session' THEN s.title
                WHEN r.item_type = 'teacher' THEN CONCAT(u.first_name, ' ', u.last_name)
              END as item_name
       FROM reviews r
       LEFT JOIN courses c ON r.item_type = 'course' AND r.item_id = c.id
       LEFT JOIN sessions s ON r.item_type = 'session' AND r.item_id = s.id
       LEFT JOIN users u ON r.item_type = 'teacher' AND r.item_id = u.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );
    
    res.status(200).json({
      reviews: reviewsResult.rows.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        item: {
          id: review.item_id,
          type: review.item_type,
          name: review.item_name
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Server error fetching user reviews' });
  }
});

// Delete a review
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const reviewId = req.params.id;
    
    // Check if review exists and belongs to the user
    const reviewCheck = await pool.query(
      'SELECT id, item_id, item_type FROM reviews WHERE id = $1 AND user_id = $2',
      [reviewId, req.userId]
    );
    
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or does not belong to this user' });
    }
    
    const review = reviewCheck.rows[0];
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete the review
      await client.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
      
      // Update average rating if it's a course review
      if (review.item_type === 'course') {
        // Calculate new average rating
        const avgRatingResult = await client.query(
          `SELECT AVG(rating) as avg_rating FROM reviews WHERE item_id = $1 AND item_type = 'course'`,
          [review.item_id]
        );
        
        const newAvgRating = avgRatingResult.rows[0].avg_rating || 0;
        
        // Update course avg_rating
        await client.query(
          `UPDATE courses SET avg_rating = $1 WHERE id = $2`,
          [newAvgRating, review.item_id]
        );
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({ message: 'Review deleted successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Server error deleting review' });
  }
});

module.exports = router; 