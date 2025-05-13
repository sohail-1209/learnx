/**
 * LearnX - Simple Database Setup Script
 * Creates initial tables for the LearnX platform
 */

const { Client } = require('pg');

async function setupDatabase() {
  // Get password from command line arguments
  const password = process.argv[2];
  
  if (!password) {
    console.error('Please provide the database password as a command line argument.');
    console.error('Usage: node simple-db-setup.js YOUR_PASSWORD');
    process.exit(1);
  }

  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'learnx',
    password: password,
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database!');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        profile_pic VARCHAR(255),
        bio TEXT,
        is_teacher BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created users table');

    // Create courses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        price DECIMAL(10, 2) DEFAULT 0,
        image_url VARCHAR(255),
        duration INTEGER,
        level VARCHAR(50),
        tags TEXT[],
        avg_rating DECIMAL(3, 2) DEFAULT 0,
        total_students INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created courses table');

    // Create a test admin user with password "admin123"
    await client.query(`
      INSERT INTO users (email, password, first_name, last_name, is_teacher, is_admin, bio)
      VALUES ('admin@learnx.com', '$2a$10$NfM9o8KOgIobpF1OsMmRi.cqGK0rCBt9WsP3NoRIf7.qvO3jfyMVa', 'Admin', 'User', TRUE, TRUE, 'LearnX Administrator')
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('Created admin user (email: admin@learnx.com, password: admin123)');

    console.log('Basic database setup completed. The admin user has been created.');
    console.log('You can now login with:');
    console.log('Email: admin@learnx.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await client.end();
  }
}

setupDatabase(); 