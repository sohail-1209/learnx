/**
 * LearnX - Sessions Routes
 * Handles session creation, booking, and management
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken, isTeacher } = require('../middleware/auth');

// Create a new session
router.post('/', verifyToken, isTeacher, async (req, res) => {
  try {
    const { courseId, title, description, startTime, endTime, price, maxStudents, category } = req.body;
    
    // Validate input
    if (!title || !startTime || !endTime || !price) {
      return res.status(400).json({ error: 'Title, start time, end time, and price are required' });
    }
    
    // Validate that start time is before end time
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }
    
    // Validate that start time is in the future
    const now = new Date();
    if (startDate <= now) {
      return res.status(400).json({ error: 'Start time must be in the future' });
    }
    
    // Check if course exists and belongs to the teacher
    if (courseId) {
      const courseCheck = await pool.query(
        'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
        [courseId, req.userId]
      );
      
      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found or does not belong to this teacher' });
      }
    }
    
    // Generate a meeting URL (in a real app, this would integrate with Zoom, Google Meet, etc.)
    const meetingUrl = `https://meet.learnx.com/${Math.random().toString(36).substring(2, 15)}`;
    
    // Create the session
    const result = await pool.query(
      `INSERT INTO sessions 
       (course_id, teacher_id, title, description, start_time, end_time, price, max_students, meeting_url, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, description, start_time, end_time, price, max_students, category`,
      [courseId || null, req.userId, title, description, startTime, endTime, price, maxStudents || 1, meetingUrl, category || 'Other']
    );
    
    const sessionData = result.rows[0];
    
    res.status(201).json({
      message: 'Session created successfully',
      session: sessionData
    });
    
    // Add debug logging for session creation
    console.log(`New session created by teacher ${req.userId}:`, {
      sessionId: sessionData.id,
      title: sessionData.title,
      category: sessionData.category,
      startTime: sessionData.start_time,
      fullRecord: sessionData
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Server error creating session' });
  }
});

// Get all upcoming sessions
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    
    // Apply filters if provided
    const { category, priceMin, priceMax, dateFrom, dateTo, teacherId } = req.query;
    
    let query = `
      SELECT s.id, s.title, s.description, s.start_time, s.end_time, s.price, 
             s.max_students, s.current_students, c.category,
             u.id as teacher_id, u.first_name, u.last_name, u.profile_pic
      FROM sessions s
      LEFT JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.teacher_id = u.id
      WHERE s.start_time > $1 AND s.is_cancelled = FALSE
    `;
    
    const queryParams = [now];
    let paramCounter = 2;
    
    if (category) {
      query += ` AND c.category = $${paramCounter}`;
      queryParams.push(category);
      paramCounter++;
    }
    
    if (priceMin) {
      query += ` AND s.price >= $${paramCounter}`;
      queryParams.push(parseFloat(priceMin));
      paramCounter++;
    }
    
    if (priceMax) {
      query += ` AND s.price <= $${paramCounter}`;
      queryParams.push(parseFloat(priceMax));
      paramCounter++;
    }
    
    if (dateFrom) {
      query += ` AND s.start_time >= $${paramCounter}`;
      queryParams.push(dateFrom);
      paramCounter++;
    }
    
    if (dateTo) {
      query += ` AND s.start_time <= $${paramCounter}`;
      queryParams.push(dateTo);
      paramCounter++;
    }
    
    if (teacherId) {
      query += ` AND s.teacher_id = $${paramCounter}`;
      queryParams.push(teacherId);
      paramCounter++;
    }
    
    query += ' ORDER BY s.start_time ASC';
    
    const result = await pool.query(query, queryParams);
    
    const sessions = result.rows.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      startTime: session.start_time,
      endTime: session.end_time,
      price: parseFloat(session.price),
      maxStudents: session.max_students,
      currentStudents: session.current_students,
      category: session.category,
      teacher: {
        id: session.teacher_id,
        name: `${session.first_name} ${session.last_name}`,
        profilePic: session.profile_pic
      }
    }));
    
    res.status(200).json({ sessions });
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    res.status(500).json({ error: 'Server error fetching sessions' });
  }
});

// Alias for upcoming sessions (used by the learn page)
router.get('/available', async (req, res) => {
  try {
    const now = new Date();
    
    // Apply filters if provided
    const { category, priceMin, priceMax, dateFrom, dateTo, teacherId } = req.query;
    
    console.log("Request to /available received with query:", req.query);
    
    let query = `
      SELECT s.id, s.title, s.description, s.start_time, s.end_time, s.price, 
             s.max_students, s.current_students, s.category,
             u.id as teacher_id, u.first_name, u.last_name, u.profile_pic,
             up.headline
      FROM sessions s
      JOIN users u ON s.teacher_id = u.id
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE s.start_time > $1 AND s.is_cancelled = FALSE AND u.is_teacher = TRUE
    `;
    
    const queryParams = [now];
    let paramCounter = 2;
    
    if (category) {
      query += ` AND s.category = $${paramCounter}`;
      queryParams.push(category);
      paramCounter++;
    }
    
    if (priceMin) {
      query += ` AND s.price >= $${paramCounter}`;
      queryParams.push(parseFloat(priceMin));
      paramCounter++;
    }
    
    if (priceMax) {
      query += ` AND s.price <= $${paramCounter}`;
      queryParams.push(parseFloat(priceMax));
      paramCounter++;
    }
    
    if (dateFrom) {
      query += ` AND s.start_time >= $${paramCounter}`;
      queryParams.push(dateFrom);
      paramCounter++;
    }
    
    if (dateTo) {
      query += ` AND s.start_time <= $${paramCounter}`;
      queryParams.push(dateTo);
      paramCounter++;
    }
    
    if (teacherId) {
      query += ` AND s.teacher_id = $${paramCounter}`;
      queryParams.push(teacherId);
      paramCounter++;
    }
    
    query += ' ORDER BY s.start_time ASC';
    
    console.log("Executing sessions query:", { 
      query, 
      params: queryParams,
      time: now.toISOString()
    });
    
    // Check total sessions in the database regardless of filters
    const totalResult = await pool.query('SELECT COUNT(*) FROM sessions');
    console.log(`Total sessions in database: ${totalResult.rows[0].count}`);
    
    // Check teacher sessions
    const teacherResult = await pool.query('SELECT COUNT(*) FROM sessions WHERE is_cancelled = FALSE');
    console.log(`Total active sessions in database: ${teacherResult.rows[0].count}`);
    
    const result = await pool.query(query, queryParams);
    
    console.log(`Found ${result.rows.length} available sessions`);
    if (result.rows.length > 0) {
      console.log("First session:", result.rows[0]);
    }
    
    // Map sessions data to a more friendly format with proper null checks
    const sessions = result.rows.map(session => {
      // Ensure all fields have default values to prevent null reference errors
      return {
        id: session.id || 0,
        title: session.title || 'Untitled Session',
        description: session.description || '',
        startTime: session.start_time,
        endTime: session.end_time,
        price: session.price ? parseFloat(session.price) : 0,
        maxStudents: session.max_students || 10,
        currentStudents: session.current_students || 0,
        category: session.category || 'Other',
        teacher: {
          id: session.teacher_id || 0,
          name: `${session.first_name || 'Unknown'} ${session.last_name || ''}`.trim(),
          profilePic: session.profile_pic || null,
          headline: session.headline || 'Teacher at LearnX',
          hourlyRate: 45.00  // Default value since we don't have this in the database
        }
      };
    });
    
    return res.status(200).json({ sessions });
  } catch (error) {
    console.error('Error fetching available sessions:', error);
    
    // More detailed error logging to help diagnose the issue
    if (error.code) {
      console.error(`Database error code: ${error.code}`);
    }
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    
    return res.status(500).json({ 
      error: 'Server error fetching available sessions',
      errorType: error.name || 'Unknown',
      message: error.message || 'No error details available'
    });
  }
});

// Get booked sessions for the current user - MOVED UP BEFORE /:id
router.get('/booked', verifyToken, async (req, res) => {
  try {
    // Get the user ID from the verified token
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    console.log('Fetching booked sessions for user ID:', userId);

    // First check if any bookings exist for this user
    const bookingCheckQuery = 'SELECT COUNT(*) as booking_count FROM bookings WHERE user_id = $1 AND status = $2';
    const bookingCheckResult = await pool.query(bookingCheckQuery, [userId, 'confirmed']);
    
    const bookingCount = parseInt(bookingCheckResult.rows[0].booking_count);
    console.log('Found', bookingCount, 'bookings for user');
    
    // If no bookings, return empty array right away
    if (bookingCount === 0) {
      console.log('No bookings found, returning empty array');
      return res.status(200).json({
        success: true, 
        sessions: []
      });
    }

    // Query the database for the user's booked sessions
    const sessionsQuery = `
      SELECT s.id, s.title, s.description, s.start_time, s.end_time, s.price, s.category,
             u.id as teacher_id, u.first_name, u.last_name, u.profile_pic,
             up.headline
      FROM bookings b
      JOIN sessions s ON b.session_id = s.id
      JOIN users u ON s.teacher_id = u.id
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE b.user_id = $1 AND b.status = $2
      ORDER BY s.start_time ASC
    `;
    
    console.log('Executing booked sessions query for user:', userId);
    const result = await pool.query(sessionsQuery, [userId, 'confirmed']);
    console.log('Query returned', result.rows.length, 'sessions');
    
    // Format the sessions for the response
    const bookedSessions = result.rows.map(session => ({
      id: session.id,
      title: session.title || 'Untitled Session',
      description: session.description || '',
      startTime: session.start_time,
      endTime: session.end_time,
      price: parseFloat(session.price || 0),
      category: session.category || 'Other',
      teacher: {
        id: session.teacher_id || 0,
        name: `${session.first_name || 'Unknown'} ${session.last_name || ''}`.trim(),
        headline: session.headline || '',
        profilePic: session.profile_pic || null
      }
    }));

    return res.status(200).json({
      success: true, 
      sessions: bookedSessions
    });
    
  } catch (error) {
    console.error('Error in /booked endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error fetching session'
    });
  }
});

// User's booked sessions endpoint - MOVED UP BEFORE /:id
router.get('/user-bookings', verifyToken, async (req, res) => {
  try {
    // Get the user ID from the verified token
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    console.log('Fetching booked sessions for user ID:', userId);

    // First check if any bookings exist for this user
    const bookingCheckQuery = 'SELECT COUNT(*) as booking_count FROM bookings WHERE user_id = $1 AND status = $2';
    const bookingCheckResult = await pool.query(bookingCheckQuery, [userId, 'confirmed']);
    
    const bookingCount = parseInt(bookingCheckResult.rows[0].booking_count);
    console.log('Found', bookingCount, 'bookings for user');
    
    // If no bookings, return empty array right away
    if (bookingCount === 0) {
      console.log('No bookings found, returning empty array');
      return res.status(200).json({
        success: true, 
        sessions: []
      });
    }

    // Query the database for the user's booked sessions
    const sessionsQuery = `
      SELECT s.id, s.title, s.description, s.start_time, s.end_time, s.price, s.category,
             u.id as teacher_id, u.first_name, u.last_name, u.profile_pic,
             up.headline
      FROM bookings b
      JOIN sessions s ON b.session_id = s.id
      JOIN users u ON s.teacher_id = u.id
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE b.user_id = $1 AND b.status = $2
      ORDER BY s.start_time ASC
    `;
    
    console.log('Executing user-bookings sessions query for user:', userId);
    const result = await pool.query(sessionsQuery, [userId, 'confirmed']);
    console.log('Query returned', result.rows.length, 'sessions');
    
    // Format the sessions for the response
    const bookedSessions = result.rows.map(session => ({
      id: session.id,
      title: session.title || 'Untitled Session',
      description: session.description || '',
      startTime: session.start_time,
      endTime: session.end_time,
      price: parseFloat(session.price || 0),
      category: session.category || 'Other',
      teacher: {
        id: session.teacher_id || 0,
        name: `${session.first_name || 'Unknown'} ${session.last_name || ''}`.trim(),
        headline: session.headline || '',
        profilePic: session.profile_pic || null
      }
    }));

    return res.status(200).json({
      success: true, 
      sessions: bookedSessions
    });
    
  } catch (error) {
    console.error('Error in /user-bookings endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error fetching booked sessions'
    });
  }
});

// Get a single session by ID
router.get('/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Check for mock session IDs
    if (sessionId === '101' || sessionId === '102' || sessionId === '103') {
      const mockSessions = {
        '101': {
          id: 101,
          title: "JavaScript Fundamentals",
          description: "Learn the basics of JavaScript programming",
          startTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes in the future
          endTime: new Date(Date.now() + 1000 * 60 * 65).toISOString(), // 65 minutes in the future
          price: 25.00,
          category: "Coding",
          maxStudents: 10,
          currentStudents: 5,
          meetingUrl: "https://meet.jit.si/LearnX-JavaScript-Fundamentals",
          isCancelled: false,
          teacher: {
            id: 201,
            name: "John Doe",
            headline: "Senior JavaScript Developer",
            profilePic: "https://randomuser.me/api/portraits/men/32.jpg",
            bio: "Experienced JavaScript developer with 10+ years of experience"
          }
        },
        '102': {
          id: 102,
          title: "React Hooks in Depth",
          description: "Master React hooks for modern web development",
          startTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes in the past (active now)
          endTime: new Date(Date.now() + 1000 * 60 * 50).toISOString(), // 50 minutes in the future
          price: 35.00,
          category: "Coding",
          maxStudents: 8,
          currentStudents: 6,
          meetingUrl: "https://meet.jit.si/LearnX-React-Hooks",
          isCancelled: false,
          teacher: {
            id: 202,
            name: "Sarah Parker",
            headline: "Frontend Engineer at Meta",
            profilePic: "https://randomuser.me/api/portraits/women/44.jpg",
            bio: "Frontend developer specializing in React and modern JavaScript frameworks"
          }
        },
        '103': {
          id: 103,
          title: "UI/UX Design Principles",
          description: "Learn effective design for better user experiences",
          startTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day in the future
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 25).toISOString(), // 25 hours in the future
          price: 40.00,
          category: "Design",
          maxStudents: 12,
          currentStudents: 3,
          meetingUrl: "https://meet.jit.si/LearnX-UIUX-Design",
          isCancelled: false,
          teacher: {
            id: 203,
            name: "Michael Wilson",
            headline: "Product Designer",
            profilePic: "https://randomuser.me/api/portraits/men/67.jpg",
            bio: "Product designer with experience in creating intuitive user interfaces"
          }
        }
      };
      
      // Return the mock session if it exists
      if (mockSessions[sessionId]) {
        return res.status(200).json({
          success: true,
          session: mockSessions[sessionId],
          reviews: []
        });
      } else {
        return res.status(404).json({ error: 'Session not found' });
      }
    }
    
    // Continue with the existing database query for real sessions
    const result = await pool.query(
      `SELECT s.id, s.title, s.description, s.start_time, s.end_time, s.price,
              s.max_students, s.current_students, s.meeting_url, s.is_cancelled,
              c.id as course_id, c.title as course_title, c.category,
              u.id as teacher_id, u.first_name, u.last_name, u.profile_pic, u.bio
       FROM sessions s
       LEFT JOIN courses c ON s.course_id = c.id
       JOIN users u ON s.teacher_id = u.id
       WHERE s.id = $1`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = result.rows[0];
    
    // Get reviews for the teacher
    const reviewsResult = await pool.query(
      `SELECT r.rating, r.comment, r.created_at,
              u.first_name, u.last_name, u.profile_pic
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.item_type = 'teacher' AND r.item_id = $1
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [session.teacher_id]
    );
    
    res.status(200).json({
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        startTime: session.start_time,
        endTime: session.end_time,
        price: parseFloat(session.price),
        maxStudents: session.max_students,
        currentStudents: session.current_students,
        meetingUrl: session.meeting_url,
        isCancelled: session.is_cancelled,
        course: session.course_id ? {
          id: session.course_id,
          title: session.course_title,
          category: session.category
        } : null,
        teacher: {
          id: session.teacher_id,
          name: `${session.first_name} ${session.last_name}`,
          profilePic: session.profile_pic,
          bio: session.bio
        }
      },
      reviews: reviewsResult.rows.map(review => ({
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        reviewer: {
          name: `${review.first_name} ${review.last_name}`,
          profilePic: review.profile_pic
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Server error fetching session' });
  }
});

// Book a session
router.post('/:id/book', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { notes } = req.body;
    
    // Check if session exists and has space
    const sessionCheck = await pool.query(
      `SELECT id, teacher_id, max_students, current_students, price, start_time, title
       FROM sessions
       WHERE id = $1 AND is_cancelled = FALSE`,
      [sessionId]
    );
    
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or cancelled' });
    }
    
    const session = sessionCheck.rows[0];
    
    // Check if session is in the future
    const now = new Date();
    if (new Date(session.start_time) <= now) {
      return res.status(400).json({ error: 'Cannot book a session that has already started' });
    }
    
    // Check if there's space available
    if (session.current_students >= session.max_students) {
      return res.status(400).json({ error: 'Session is already full' });
    }
    
    // Check if the user is not trying to book their own session
    if (session.teacher_id === req.userId) {
      return res.status(400).json({ error: 'You cannot book your own session' });
    }
    
    // Check if user already has a booking for this session
    const bookingCheck = await pool.query(
      'SELECT id FROM bookings WHERE session_id = $1 AND user_id = $2',
      [sessionId, req.userId]
    );
    
    if (bookingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You have already booked this session' });
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
    const sessionPrice = parseFloat(session.price);
    
    if (balance < sessionPrice) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (session_id, user_id, notes, status)
         VALUES ($1, $2, $3, 'confirmed')
         RETURNING id`,
        [sessionId, req.userId, notes]
      );
      
      // Update session current_students
      await client.query(
        `UPDATE sessions 
         SET current_students = current_students + 1
         WHERE id = $1`,
        [sessionId]
      );
      
      // Update user's wallet balance
      await client.query(
        `UPDATE wallet 
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [sessionPrice, req.userId]
      );
      
      // Add transaction record
      await client.query(
        `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
         SELECT w.id, $1, 'payment', $2, $3
         FROM wallet w
         WHERE w.user_id = $4`,
        [sessionPrice, `Payment for session: ${session.title}`, sessionId, req.userId]
      );
      
      // Add credit to teacher's wallet
      await client.query(
        `UPDATE wallet 
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [sessionPrice, session.teacher_id]
      );
      
      // Add transaction record for teacher
      await client.query(
        `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
         SELECT w.id, $1, 'earning', $2, $3
         FROM wallet w
         WHERE w.user_id = $4`,
        [sessionPrice, `Earning from session: ${session.title}`, sessionId, session.teacher_id]
      );
      
      // Create notification for the teacher
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES ($1, 'New booking', $2, 'booking', $3)`,
        [
          session.teacher_id,
          `${req.userEmail} has booked your session: ${session.title}`,
          sessionId
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(200).json({
        message: 'Session booked successfully',
        bookingId: bookingResult.rows[0].id
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error booking session:', error);
    res.status(500).json({ error: 'Server error booking session' });
  }
});

// Get user's schedule (upcoming sessions)
router.get('/schedule/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const now = new Date();
    
    // Get upcoming sessions user is teaching
    let teachingSessions = [];
    const teachingResult = await pool.query(
      `SELECT s.id, s.title, s.start_time as datetime, s.end_time,
              s.current_students, s.max_students
       FROM sessions s
       WHERE s.teacher_id = $1 AND s.start_time > $2 AND s.is_cancelled = FALSE
       ORDER BY s.start_time ASC`,
      [userId, now]
    );
    
    if (teachingResult.rows.length > 0) {
      teachingSessions = teachingResult.rows.map(session => ({
        ...session,
        role: 'teacher'
      }));
    }
    
    // Get upcoming sessions user is taking
    let learningSessionsResult = await pool.query(
      `SELECT s.id, s.title, s.start_time as datetime, s.end_time,
              u.first_name, u.last_name
       FROM bookings b
       JOIN sessions s ON b.session_id = s.id
       JOIN users u ON s.teacher_id = u.id
       WHERE b.user_id = $1 AND s.start_time > $2 AND b.status = 'confirmed'
       ORDER BY s.start_time ASC`,
      [userId, now]
    );
    
    let learningSessions = [];
    if (learningSessionsResult.rows.length > 0) {
      learningSessions = learningSessionsResult.rows.map(session => ({
        ...session,
        instructor: `${session.first_name} ${session.last_name}`,
        role: 'student'
      }));
    }
    
    // Combine and sort by date
    const upcomingSessions = [...teachingSessions, ...learningSessions]
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    
    // Get past sessions
    const pastSessionsResult = await pool.query(
      `SELECT s.id, s.title, s.start_time as datetime,
              u.first_name, u.last_name
       FROM bookings b
       JOIN sessions s ON b.session_id = s.id
       JOIN users u ON s.teacher_id = u.id
       WHERE b.user_id = $1 AND s.start_time < $2 AND b.status IN ('confirmed', 'completed')
       ORDER BY s.start_time DESC
       LIMIT 10`,
      [userId, now]
    );
    
    let history = [];
    if (pastSessionsResult.rows.length > 0) {
      history = pastSessionsResult.rows.map(session => ({
        ...session,
        instructor: `${session.first_name} ${session.last_name}`
      }));
    }
    
    // Get user's availability
    const availabilityResult = await pool.query(
      `SELECT day_of_week, start_time, end_time
       FROM availability
       WHERE user_id = $1`,
      [userId]
    );
    
    let availability = {
      days: [],
      timeFrom: 9,
      timeTo: 17
    };
    
    if (availabilityResult.rows.length > 0) {
      // Map day numbers to day names
      const dayMap = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
      };
      
      // Extract unique days
      const days = [...new Set(availabilityResult.rows.map(row => dayMap[row.day_of_week]))];
      
      // Get earliest start time and latest end time
      const startTimes = availabilityResult.rows.map(row => {
        const timeParts = row.start_time.split(':');
        return parseInt(timeParts[0]);
      });
      
      const endTimes = availabilityResult.rows.map(row => {
        const timeParts = row.end_time.split(':');
        return parseInt(timeParts[0]);
      });
      
      availability = {
        days,
        timeFrom: Math.min(...startTimes),
        timeTo: Math.max(...endTimes)
      };
    }
    
    res.status(200).json({
      upcomingSessions,
      history,
      availability
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Server error fetching schedule' });
  }
});

// Cancel a session (for teacher)
router.put('/:id/cancel', verifyToken, isTeacher, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Check if session exists and belongs to the teacher
    const sessionCheck = await pool.query(
      `SELECT id, start_time, current_students
       FROM sessions
       WHERE id = $1 AND teacher_id = $2`,
      [sessionId, req.userId]
    );
    
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or does not belong to this teacher' });
    }
    
    const session = sessionCheck.rows[0];
    
    // Check if session has already started
    const now = new Date();
    if (new Date(session.start_time) <= now) {
      return res.status(400).json({ error: 'Cannot cancel a session that has already started' });
    }
    
    // Get all bookings for this session
    const bookingsResult = await pool.query(
      `SELECT b.id, b.user_id, s.price
       FROM bookings b
       JOIN sessions s ON b.session_id = s.id
       WHERE b.session_id = $1 AND b.status = 'confirmed'`,
      [sessionId]
    );
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update session to cancelled
      await client.query(
        `UPDATE sessions 
         SET is_cancelled = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [sessionId]
      );
      
      // Process refunds for all bookings
      for (const booking of bookingsResult.rows) {
        // Update booking status
        await client.query(
          `UPDATE bookings 
           SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [booking.id]
        );
        
        const price = parseFloat(booking.price);
        
        // Refund student
        await client.query(
          `UPDATE wallet 
           SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [price, booking.user_id]
        );
        
        // Add transaction record for refund
        await client.query(
          `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
           SELECT w.id, $1, 'refund', $2, $3
           FROM wallet w
           WHERE w.user_id = $4`,
          [price, 'Refund for cancelled session', sessionId, booking.user_id]
        );
        
        // Deduct from teacher's wallet
        await client.query(
          `UPDATE wallet 
           SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [price, req.userId]
        );
        
        // Add transaction record for teacher deduction
        await client.query(
          `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
           SELECT w.id, $1, 'deduction', $2, $3
           FROM wallet w
           WHERE w.user_id = $4`,
          [price, 'Deduction for cancelled session', sessionId, req.userId]
        );
        
        // Create notification for student
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id)
           VALUES ($1, 'Session Cancelled', $2, 'cancellation', $3)`,
          [
            booking.user_id,
            'A session you booked has been cancelled and refunded',
            sessionId
          ]
        );
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({
        message: 'Session cancelled successfully',
        refundsProcessed: bookingsResult.rows.length
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ error: 'Server error cancelling session' });
  }
});

// Update teacher availability
router.post('/availability', verifyToken, isTeacher, async (req, res) => {
  try {
    const { days, timeFrom, timeTo } = req.body;
    
    // Validate input
    if (!days || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: 'At least one day must be selected' });
    }
    
    if (timeFrom >= timeTo) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }
    
    // Map day names to day numbers
    const dayMap = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    // Format times as HH:00:00
    const formattedTimeFrom = `${timeFrom}:00:00`;
    const formattedTimeTo = `${timeTo}:00:00`;
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete existing availability
      await client.query(
        'DELETE FROM availability WHERE user_id = $1',
        [req.userId]
      );
      
      // Add new availability for each day
      for (const day of days) {
        const dayNumber = dayMap[day.toLowerCase()];
        
        if (dayNumber !== undefined) {
          await client.query(
            `INSERT INTO availability (user_id, day_of_week, start_time, end_time)
             VALUES ($1, $2, $3, $4)`,
            [req.userId, dayNumber, formattedTimeFrom, formattedTimeTo]
          );
        }
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({
        message: 'Availability updated successfully',
        availability: {
          days,
          timeFrom,
          timeTo
        }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Server error updating availability' });
  }
});

// Cancel a booking (for student)
router.put('/bookings/:id/cancel', verifyToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    // Check if booking exists and belongs to the user
    const bookingCheck = await pool.query(
      `SELECT b.id, b.session_id, b.status, s.start_time, s.price, s.teacher_id, s.title
       FROM bookings b
       JOIN sessions s ON b.session_id = s.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [bookingId, req.userId]
    );
    
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or does not belong to this user' });
    }
    
    const booking = bookingCheck.rows[0];
    
    // Check if booking is already cancelled or completed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: `Cannot cancel a booking with status: ${booking.status}` });
    }
    
    // Check if session has already started
    const now = new Date();
    const sessionStart = new Date(booking.start_time);
    
    if (sessionStart <= now) {
      return res.status(400).json({ error: 'Cannot cancel a booking for a session that has already started' });
    }
    
    // Check cancellation policy - if too close to start time, may not refund full amount
    const hoursUntilStart = (sessionStart - now) / (1000 * 60 * 60);
    let refundAmount = parseFloat(booking.price);
    let refundPercent = 100;
    
    // Less than 24 hours - 50% refund
    if (hoursUntilStart < 24) {
      refundAmount = refundAmount * 0.5;
      refundPercent = 50;
    }
    
    // Less than 2 hours - 0% refund
    if (hoursUntilStart < 2) {
      refundAmount = 0;
      refundPercent = 0;
    }
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update booking status
      await client.query(
        `UPDATE bookings 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [bookingId]
      );
      
      // Update session current_students
      await client.query(
        `UPDATE sessions 
         SET current_students = current_students - 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [booking.session_id]
      );
      
      if (refundAmount > 0) {
        // Process refund
        await client.query(
          `UPDATE wallet 
           SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [refundAmount, req.userId]
        );
        
        // Add transaction record for refund
        await client.query(
          `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
           SELECT w.id, $1, 'refund', $2, $3
           FROM wallet w
           WHERE w.user_id = $4`,
          [refundAmount, `${refundPercent}% refund for cancelled booking`, booking.session_id, req.userId]
        );
        
        // Deduct from teacher's wallet
        await client.query(
          `UPDATE wallet 
           SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [refundAmount, booking.teacher_id]
        );
        
        // Add transaction record for teacher deduction
        await client.query(
          `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
           SELECT w.id, $1, 'deduction', $2, $3
           FROM wallet w
           WHERE w.user_id = $4`,
          [refundAmount, `Deduction for cancelled booking by student`, booking.session_id, booking.teacher_id]
        );
      }
      
      // Create notification for teacher
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES ($1, 'Booking Cancelled', $2, 'cancellation', $3)`,
        [
          booking.teacher_id,
          `A student has cancelled their booking for your session: ${booking.title}`,
          booking.session_id
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(200).json({
        message: 'Booking cancelled successfully',
        refundPercent,
        refundAmount
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Server error cancelling booking' });
  }
});

module.exports = router; 