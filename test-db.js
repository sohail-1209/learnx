const { Client } = require('pg');

async function testConnection() {
  // Get password from command line
  const password = process.argv[2];

  if (!password) {
    console.error('Please provide your PostgreSQL password as a command line argument.');
    console.error('Usage: node test-db.js YOUR_PASSWORD');
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
    console.log('✅ Database connection successful!');
    
    // Test query
    const result = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Users in the database: ${result.rows[0].count}`);
    
    console.log('\nDatabase connection is working properly.');
    console.log('Please update your .env file with this password:');
    console.log('\nDB_PASSWORD=' + password);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await client.end();
  }
}

testConnection(); 