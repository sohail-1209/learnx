/**
 * Script to alter the profile_pic column in the users table
 * This script changes it from VARCHAR(255) to TEXT to allow storing larger images
 */

require('dotenv').config();
const { Pool } = require('pg');

// Connect to the database
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'hawa9',
  port: process.env.DB_PORT || 5432,
});

// Function to alter the column
async function alterProfilePicColumn() {
  try {
    // Connect to the database
    const client = await pool.connect();
    
    console.log('Altering users table profile_pic column...');
    
    // Alter the column
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN profile_pic TYPE TEXT;
    `);
    
    console.log('Column altered successfully!');
    
    // Release the client
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error altering column:', error);
    process.exit(1);
  }
}

// Execute the function
alterProfilePicColumn(); 