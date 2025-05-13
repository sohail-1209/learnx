/**
 * LearnX - Create Test User
 * This script adds a test user to the database for development purposes
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'learnx',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
  });

  try {
    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const userResult = await pool.query(
      `INSERT INTO users (
        email, password, first_name, last_name, bio, is_teacher, is_admin
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id`,
      [
        'testuser@example.com',
        hashedPassword,
        'John',
        'Doe',
        'I am a test user for the LearnX platform.',
        true,
        false
      ]
    );
    
    const userId = userResult.rows[0].id;
    console.log(`Created test user with ID: ${userId}`);
    
    // Create user profile
    await pool.query(
      `INSERT INTO user_profile (
        user_id, headline, skills, education, experience, languages, website
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'Full Stack Developer | JS Expert',
        ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'CSS'],
        JSON.stringify([{ 
          degree: 'B.S. Computer Science', 
          institution: 'Tech University',
          year: '2020'
        }]),
        JSON.stringify([{
          title: 'Senior Developer',
          company: 'Tech Co.',
          years: '2020-Present',
          description: 'Developing web applications using modern technologies.'
        }]),
        ['English', 'Spanish'],
        'https://johndoe.example.com'
      ]
    );
    
    console.log('Added user profile');
    
    // Create wallet
    await pool.query(
      `INSERT INTO wallet (user_id, balance) VALUES ($1, $2)`,
      [userId, 100.00]
    );
    
    console.log('Created wallet with $100 balance');
    
    // Create a course
    await pool.query(
      `INSERT INTO courses (
        teacher_id, title, description, category, price, level, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'JavaScript Fundamentals',
        'Learn the basics of JavaScript from scratch.',
        'Programming',
        49.99,
        'Beginner',
        true
      ]
    );
    
    console.log('Created sample course');
    
    console.log('Test user setup complete!');
    console.log('--------------------------------');
    console.log('Login with:');
    console.log('Email: testuser@example.com');
    console.log('Password: password123');
    console.log('--------------------------------');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser(); 