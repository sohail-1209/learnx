/**
 * LearnX - Test Sessions Script
 * Tests the available sessions endpoint
 */

const { Pool } = require('pg');

console.log('Starting test script...');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'hawa9',
  port: process.env.DB_PORT || 5432,
});

console.log('Database pool created');

async function testSessions() {
  console.log('Starting testSessions function');
  try {
    console.log('Attempting to query all sessions...');
    // Get all sessions
    const allSessions = await pool.query('SELECT * FROM sessions');
    console.log(`Total sessions in database: ${allSessions.rows.length}`);
    
    if (allSessions.rows.length > 0) {
      console.log('Sample session:', allSessions.rows[0]);
    } else {
      console.log('No sessions found in the database!');
    }
    
    // Check user is teacher flag
    const teacherIds = allSessions.rows.map(s => s.teacher_id);
    console.log('Teacher IDs found:', teacherIds);
    
    if (teacherIds.length > 0) {
      console.log('Checking teacher status for users...');
      const userCheck = await pool.query(
        'SELECT id, first_name, last_name, is_teacher FROM users WHERE id = ANY($1)',
        [teacherIds]
      );
      
      console.log('Teacher users:', userCheck.rows);
      
      // Check if any teachers have is_teacher = FALSE
      const nonTeachers = userCheck.rows.filter(u => !u.is_teacher);
      if (nonTeachers.length > 0) {
        console.log('Users marked as non-teachers who have sessions:', nonTeachers);
      }
    }
    
    // Run the query that the API endpoint uses
    console.log('Running API endpoint query...');
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    const apiQuery = `
      SELECT s.id, s.title, s.description, s.start_time, s.end_time, s.price, 
             s.max_students, s.current_students, s.category,
             u.id as teacher_id, u.first_name, u.last_name, u.profile_pic,
             up.headline
      FROM sessions s
      JOIN users u ON s.teacher_id = u.id
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE s.start_time > $1 AND s.is_cancelled = FALSE AND u.is_teacher = TRUE
    `;
    
    const apiResult = await pool.query(apiQuery, [now]);
    console.log(`API query returned ${apiResult.rows.length} sessions`);
    
    if (apiResult.rows.length > 0) {
      console.log('API query result sample:', apiResult.rows[0]);
    } else {
      console.log('No sessions match the API query criteria');
      
      // Check all future sessions regardless of teacher status
      console.log('Checking all future sessions regardless of teacher status...');
      const futureQuery = await pool.query(
        'SELECT s.id, s.title, s.start_time, u.id as teacher_id, u.is_teacher FROM sessions s JOIN users u ON s.teacher_id = u.id WHERE s.start_time > $1',
        [now]
      );
      console.log(`Future sessions: ${futureQuery.rows.length}`);
      console.log('Future sessions:', futureQuery.rows);
    }
    
    // Check if sessions are in the past
    const pastSessions = allSessions.rows.filter(s => new Date(s.start_time) <= now);
    if (pastSessions.length > 0) {
      console.log(`Found ${pastSessions.length} sessions in the past that might not be showing`);
      pastSessions.forEach(s => {
        console.log(`Session ${s.id}: ${s.title} at ${s.start_time}`);
      });
    }
    
    // Check cancelled sessions
    const cancelledSessions = allSessions.rows.filter(s => s.is_cancelled);
    if (cancelledSessions.length > 0) {
      console.log(`Found ${cancelledSessions.length} cancelled sessions`);
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error testing sessions:', error);
  } finally {
    console.log('Closing database pool');
    pool.end();
  }
}

testSessions()
  .then(() => console.log('Test script completed'))
  .catch(err => console.error('Error in test script:', err)); 