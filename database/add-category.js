/**
 * LearnX - Add Category Column to Sessions Table
 * Adds a category column to the sessions table if it doesn't exist
 */

require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function addCategoryColumn() {
  const client = await pool.connect();
  try {
    // Check if the column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      AND column_name = 'category'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('Adding category column to sessions table...');
      
      // Add the column
      await client.query(`
        ALTER TABLE sessions 
        ADD COLUMN category VARCHAR(100) DEFAULT 'Other'
      `);
      
      console.log('Category column added successfully');
    } else {
      console.log('Category column already exists');
    }
  } catch (error) {
    console.error('Error adding category column:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the function
addCategoryColumn(); 