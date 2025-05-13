/**
 * LearnX - Database Migration
 * Script to update the database schema
 */

const { pool } = require('./server');

async function runMigration() {
  try {
    console.log('Running database migration...');

    // Add category column to sessions table if it doesn't exist
    await pool.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'Other'
    `);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 