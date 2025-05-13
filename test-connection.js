const { Pool } = require('pg');

// Create a connection pool with detailed logging
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres', // Using default postgres password
  port: process.env.DB_PORT || 5432,
});

// Test the connection
async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Connection config:', {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'learnx',
      port: process.env.DB_PORT || 5432
    });

    // Try to connect
    const client = await pool.connect();
    console.log('Successfully connected to the database!');

    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);

    // Test a query to the bookings table
    const bookingsResult = await client.query('SELECT COUNT(*) FROM bookings');
    console.log('Number of bookings:', bookingsResult.rows[0].count);

    client.release();
    await pool.end();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

testConnection(); 