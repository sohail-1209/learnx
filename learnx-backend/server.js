const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000; // Or your desired port

// PostgreSQL connection pool setup
const pool = new Pool({
  user: 'placeholder_user', // Replace with your PostgreSQL username
  host: 'localhost', // Replace with your PostgreSQL host
  database: 'your_database_name', // Replace with your PostgreSQL database name
  password: 'placeholder_password', // Replace with your PostgreSQL password
  port: 5432, // Replace with your PostgreSQL port
});

// Connect to PostgreSQL (optional, the pool will connect on first query)
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to PostgreSQL database');
    done();
  }
});

// GET endpoint to fetch user data by userId
app.get('/api/profile/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await pool.query(
      'SELECT id, username, bio, profile_picture_url, email, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch user's recent activity by userId for the dashboard
app.get('/api/dashboard/activity/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming a 'user_activities' table with fields like user_id, activity_type, description, timestamp
    const result = await pool.query(
      'SELECT activity_type, description, timestamp FROM user_activities WHERE user_id = $1 ORDER BY timestamp DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user activity:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch user's course progress by userId for the dashboard
app.get('/api/dashboard/progress/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming a 'user_course_progress' table with fields like user_id, course_id, completion_percentage
    // You might need to join with a 'courses' table to get course names
    const result = await pool.query(
      'SELECT course_id, completion_percentage FROM user_course_progress WHERE user_id = $1',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user course progress:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch user's notifications by userId for the dashboard
app.get('/api/dashboard/notifications/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming a 'notifications' table with fields like user_id, message, created_at, is_read
    const result = await pool.query(
      'SELECT message, created_at, is_read FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch all courses for the learning page
app.get('/api/courses', async (req, res) => {
  try {
    // Assuming a 'courses' table with fields like id, title, description, instructor_id, etc.
    const result = await pool.query('SELECT id, title, description, instructor_id FROM courses'); // Adjust fields as needed
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch courses enrolled by a specific user for the learning page
app.get('/api/users/:userId/courses', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming an 'enrollments' table linking users and courses, and a 'courses' table
    // Join enrollments with courses to get course details for the user's enrolled courses
    const result = await pool.query(
      'SELECT c.id, c.title, c.description, c.instructor_id FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.user_id = $1', // Adjust fields and table names as needed
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user enrolled courses:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch all live sessions
app.get('/api/live-sessions', async (req, res) => {
  try {
    // Assuming a 'live_sessions' table with fields like id, title, description, instructor_id, start_time, end_time, join_url, etc.
    const result = await pool.query('SELECT id, title, description, instructor_id, start_time, end_time, join_url FROM live_sessions'); // Adjust fields as needed
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching live sessions:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch live sessions registered by a specific user
app.get('/api/users/:userId/live-sessions', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming a 'session_registrations' table linking users and live_sessions, and a 'live_sessions' table
    // Join session_registrations with live_sessions to get session details for the user's registered sessions
    const result = await pool.query(
      'SELECT ls.id, ls.title, ls.description, ls.instructor_id, ls.start_time, ls.end_time, ls.join_url FROM live_sessions ls JOIN session_registrations sr ON ls.id = sr.session_id WHERE sr.user_id = $1', // Adjust fields and table names as needed
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user registered live sessions:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch all marketplace items
app.get('/api/marketplace/items', async (req, res) => {
  try {
    // Assuming a 'marketplace_items' table with fields like id, title, description, price, seller_id, etc.
    const result = await pool.query('SELECT id, title, description, price, seller_id FROM marketplace_items'); // Adjust fields as needed
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching marketplace items:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch items listed by a specific user
app.get('/api/users/:userId/listings', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming a 'marketplace_items' table where seller_id is the user ID
    const result = await pool.query(
      'SELECT id, title, description, price FROM marketplace_items WHERE seller_id = $1', // Adjust fields as needed
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user listings:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch user's schedule by userId
app.get('/api/users/:userId/schedule', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming a 'schedule' table with fields like user_id, title, description, start_time, end_time, etc.
    const result = await pool.query(
      'SELECT id, title, description, start_time, end_time FROM schedule WHERE user_id = $1 ORDER BY start_time', // Adjust fields as needed
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user schedule:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch user settings by userId
app.get('/api/users/:userId/settings', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming a 'user_settings' table for preferences and potentially using the 'users' table for profile-like settings
    // You might need to join these tables or make separate queries depending on your schema.
    // This example fetches from a hypothetical 'user_settings' table and includes basic user info.
    const result = await pool.query(
      `SELECT
         u.username,
         u.email,
         us.notification_preferences, -- Assuming notification_preferences in user_settings
         us.theme_preference, -- Assuming theme_preference in user_settings
         us.language_preference -- Assuming language_preference in user_settings
       FROM users u
       LEFT JOIN user_settings us ON u.id = us.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'User settings not found' }); // Or User not found
    }
  } catch (err) {
    console.error('Error fetching user settings:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT endpoint to update user settings by userId
app.put('/api/users/:userId/settings', async (req, res) => {
  const userId = req.params.userId;
  const { notification_preferences, theme_preference, language_preference } = req.body; // Assuming these are the updatable fields

  try {
    // Assuming a 'user_settings' table and potentially the 'users' table for profile updates.
    // This example updates the hypothetical 'user_settings' table. You might need additional queries
    // to update the 'users' table if profile information is edited on the settings page.
    const result = await pool.query(
      `UPDATE user_settings
       SET notification_preferences = $1, theme_preference = $2, language_preference = $3
       WHERE user_id = $4 RETURNING *`, // RETURNING * is optional, useful for verification
      [notification_preferences, theme_preference, language_preference, userId]
    );

    if (result.rows.length > 0) {
      res.json({ message: 'Settings updated successfully', updatedSettings: result.rows[0] });
    } else {
      res.status(404).json({ message: 'User settings not found or no changes applied' });
    }
  } catch (err) {
    console.error('Error updating user settings:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch courses and live sessions taught by a specific user
app.get('/api/users/:userId/teaching', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Assuming 'courses' table has an 'instructor_id' field and 'live_sessions' table has an 'instructor_id' field
    const taughtCourses = await pool.query(
      'SELECT id, title, description FROM courses WHERE instructor_id = $1', // Adjust fields as needed
      [userId]
    );

    const taughtLiveSessions = await pool.query(
      'SELECT id, title, start_time, end_time FROM live_sessions WHERE instructor_id = $1', // Adjust fields as needed
      [userId]
    );

    res.json({
      courses: taughtCourses.rows,
      liveSessions: taughtLiveSessions.rows,
    });

  } catch (err) {
    console.error('Error fetching user teaching data:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET endpoint to fetch user's to-do list by userId
// Assumed table: 'todo_items' with fields: id, user_id, task_description, is_completed, created_at, due_date
app.get('/api/users/:userId/todos', async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await pool.query(
      'SELECT id, task_description, is_completed, created_at, due_date FROM todo_items WHERE user_id = $1 ORDER BY created_at',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user to-dos:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST endpoint to create a new to-do item for a user
// Assumed table: 'todo_items' with fields: id, user_id, task_description, is_completed, created_at, due_date
app.post('/api/users/:userId/todos', async (req, res) => {
  const userId = req.params.userId;
  const { task_description, due_date } = req.body; // Assuming task_description is required and due_date is optional

  try {
    // is_completed defaults to false, created_at defaults to now()
    const result = await pool.query(
      'INSERT INTO todo_items (user_id, task_description, due_date) VALUES ($1, $2, $3) RETURNING *',
      [userId, task_description, due_date]
    );
    res.status(201).json({ message: 'To-do item created successfully', todoItem: result.rows[0] });
  } catch (err) {
    console.error('Error creating to-do item:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT endpoint to update a specific to-do item by todoId
// Assumed table: 'todo_items' with fields: id, user_id, task_description, is_completed, created_at, due_date
app.put('/api/todos/:todoId', async (req, res) => {
  const todoId = req.params.todoId;
  const { task_description, is_completed, due_date } = req.body; // Allow updating these fields

  try {
    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (task_description !== undefined) { updateFields.push(`task_description = $${paramIndex++}`); queryParams.push(task_description); }
    if (is_completed !== undefined) { updateFields.push(`is_completed = $${paramIndex++}`); queryParams.push(is_completed); }
    if (due_date !== undefined) { updateFields.push(`due_date = $${paramIndex++}`); queryParams.push(due_date); }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    queryParams.push(todoId);
    const result = await pool.query(`UPDATE todo_items SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, queryParams);

    if (result.rows.length > 0) {
      res.json({ message: 'To-do item updated successfully', todoItem: result.rows[0] });
    } else {
      res.status(404).json({ message: 'To-do item not found or no changes applied' });
    }
  } catch (err) {
    console.error('Error updating to-do item:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE endpoint to delete a specific to-do item by todoId
// Assumed table: 'todo_items' with field: id
app.delete('/api/todos/:todoId', async (req, res) => {
  const todoId = req.params.todoId;

  try {
    const result = await pool.query('DELETE FROM todo_items WHERE id = $1 RETURNING *', [todoId]);

    if (result.rows.length > 0) {
      res.json({ message: 'To-do item deleted successfully', deletedItem: result.rows[0] });
    } else {
      res.status(404).json({ message: 'To-do item not found' });
    }
  } catch (err) {
    console.error('Error deleting to-do item:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});