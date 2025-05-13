/**
 * LearnX - Database Setup Script
 * Creates all necessary tables for the LearnX platform
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

// Create tables
async function setupDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Setting up LearnX database...');

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

    // Create user_profile table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        headline VARCHAR(255),
        skills TEXT[],
        education JSONB,
        experience JSONB,
        languages TEXT[],
        website VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('Created user_profile table');

    // Create wallet table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('Created wallet table');

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        wallet_id INTEGER REFERENCES wallet(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL, -- deposit, withdrawal, payment, earning, refund, deduction
        description TEXT,
        reference_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created transactions table');

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
        duration INTEGER, -- in minutes
        level VARCHAR(50), -- beginner, intermediate, advanced
        tags TEXT[],
        avg_rating DECIMAL(3, 2) DEFAULT 0,
        total_students INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created courses table');

    // Create enrollments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        progress INTEGER DEFAULT 0, -- percentage
        completed BOOLEAN DEFAULT FALSE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id)
      )
    `);
    console.log('Created enrollments table');

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        price DECIMAL(10, 2) DEFAULT 0,
        max_students INTEGER DEFAULT 1,
        current_students INTEGER DEFAULT 0,
        category VARCHAR(100) DEFAULT 'Other',
        meeting_url VARCHAR(255),
        is_cancelled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created sessions table');

    // Create bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, completed, cancelled
        booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, user_id)
      )
    `);
    console.log('Created bookings table');

    // Create reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        item_id INTEGER NOT NULL,
        item_type VARCHAR(50) NOT NULL, -- course, session, teacher
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created reviews table');

    // Create todos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high
        is_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created todos table');

    // Create conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        last_message_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      )
    `);
    console.log('Created conversations table');

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created messages table');

    // Update conversations foreign key constraint for last_message_id
    await client.query(`
      ALTER TABLE conversations
      ADD CONSTRAINT fk_last_message
      FOREIGN KEY (last_message_id)
      REFERENCES messages(id) ON DELETE SET NULL
    `);

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50), -- booking, message, review, cancellation, etc.
        is_read BOOLEAN DEFAULT FALSE,
        reference_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created notifications table');

    // Create availability table
    await client.query(`
      CREATE TABLE IF NOT EXISTS availability (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created availability table');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_courses_teacher ON courses(teacher_id);
      CREATE INDEX idx_sessions_teacher ON sessions(teacher_id);
      CREATE INDEX idx_sessions_course ON sessions(course_id);
      CREATE INDEX idx_bookings_session ON bookings(session_id);
      CREATE INDEX idx_bookings_user ON bookings(user_id);
      CREATE INDEX idx_reviews_item ON reviews(item_id, item_type);
      CREATE INDEX idx_todos_user ON todos(user_id, due_date);
      CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id);
      CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
    `);
    console.log('Created database indexes');

    await client.query('COMMIT');
    console.log('Database setup completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    client.release();
    // Close the pool
    await pool.end();
  }
}

// Run setup
setupDatabase(); 