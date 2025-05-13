/**
 * LearnX - All Sessions Test Script
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'learnx',
  password: 'hawa9',
  port: 5432,
});

async function testAllSessions() {
  try {
    // Get all sessions without date filtering
    const query = `
      SELECT s.id, s.title, s.start_time, s.end_time, s.is_cancelled, 
             u.id as teacher_id, u.first_name, u.last_name, u.is_teacher 
      FROM sessions s 
      JOIN users u ON s.teacher_id = u.id
    `;
    
    const result = await pool.query(query);
    console.log(`Total sessions count: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      result.rows.forEach(session => {
        const now = new Date();
        const startTime = new Date(session.start_time);
        const isPast = startTime <= now;
        
        console.log(`Session ${session.id}: "${session.title}" by ${session.first_name} ${session.last_name}`);
        console.log(`  Start: ${session.start_time}, Is past: ${isPast}, Is teacher: ${session.is_teacher}, Is cancelled: ${session.is_cancelled}`);
      });
    } else {
      console.log('No sessions found!');
    }
    
    // Suggest fix
    const now = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // Set to 1 year in the future
    
    console.log('\nSuggested fix:');
    console.log('Your sessions appear to be in the past. You should update the start_time to future dates:');
    console.log(`Update SQL: UPDATE sessions SET start_time = '${futureDate.toISOString()}', end_time = '${new Date(futureDate.getTime() + 3600000).toISOString()}' WHERE start_time <= '${now.toISOString()}'`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testAllSessions().then(() => console.log('Test completed')); 