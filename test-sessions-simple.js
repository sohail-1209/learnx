/**
 * LearnX - Simple Test Sessions Script
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

async function testFutureSessionsOnly() {
  try {
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    // Check for future sessions
    const futureQuery = `
      SELECT s.id, s.title, s.start_time, s.is_cancelled, 
             u.id as teacher_id, u.is_teacher 
      FROM sessions s 
      JOIN users u ON s.teacher_id = u.id 
      WHERE s.start_time > $1
    `;
    
    const futureResult = await pool.query(futureQuery, [now]);
    console.log(`Future sessions count: ${futureResult.rows.length}`);
    
    if (futureResult.rows.length > 0) {
      futureResult.rows.forEach(session => {
        console.log(`Session ${session.id}: ${session.title}, start time: ${session.start_time}, teacher_id: ${session.teacher_id}, is_teacher: ${session.is_teacher}, is_cancelled: ${session.is_cancelled}`);
      });
    } else {
      console.log('No future sessions found!');
    }
    
    // Count sessions by user
    const countByUser = await pool.query(`
      SELECT s.teacher_id, u.first_name, u.last_name, u.is_teacher, COUNT(*) as session_count
      FROM sessions s
      JOIN users u ON s.teacher_id = u.id
      GROUP BY s.teacher_id, u.first_name, u.last_name, u.is_teacher
    `);
    
    console.log('\nSessions count by user:');
    countByUser.rows.forEach(row => {
      console.log(`${row.first_name} ${row.last_name} (ID: ${row.teacher_id}, is_teacher: ${row.is_teacher}) - ${row.session_count} sessions`);
    });
    
    // Check database health
    const dbResult = await pool.query('SELECT NOW()');
    console.log('\nDatabase is operational:', dbResult.rows[0].now);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testFutureSessionsOnly().then(() => console.log('Test completed')); 