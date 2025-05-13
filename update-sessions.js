/**
 * Update Session Dates Script
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'learnx',
  password: 'hawa9',
  port: 5432,
});

(async () => {
  try {
    // Get current sessions
    const currentSessions = await pool.query('SELECT id, title, start_time, end_time FROM sessions');
    console.log(`Found ${currentSessions.rows.length} sessions to update`);
    
    if (currentSessions.rows.length > 0) {
      // Calculate future date (1 year from now)
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      // Update each session with a slight time difference to maintain ordering
      for (let i = 0; i < currentSessions.rows.length; i++) {
        const session = currentSessions.rows[i];
        
        // Set start time 1 year in future, plus 30 minutes per session to stagger them
        const newStartTime = new Date(futureDate.getTime() + (i * 30 * 60 * 1000));
        
        // Set end time 1 hour after start time
        const newEndTime = new Date(newStartTime.getTime() + (60 * 60 * 1000));
        
        // Update the session
        await pool.query(
          'UPDATE sessions SET start_time = $1, end_time = $2 WHERE id = $3',
          [newStartTime.toISOString(), newEndTime.toISOString(), session.id]
        );
        
        console.log(`Updated session ${session.id}: "${session.title}"`);
        console.log(`  Old start: ${session.start_time}`);
        console.log(`  New start: ${newStartTime.toISOString()}`);
      }
      
      console.log('All sessions updated successfully!');
    }
  } catch (error) {
    console.error('Error updating sessions:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
})(); 