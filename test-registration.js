/**
 * Test script for LearnX registration endpoint
 */

const http = require('http');

function testRegistration() {
  const userData = {
    email: 'test' + Date.now() + '@example.com', // Make email unique
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    isTeacher: false
  };

  console.log('Sending registration data:', userData);
  
  const jsonData = JSON.stringify(userData);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonData)
    }
  };

  const req = http.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const responseData = JSON.parse(data);
        console.log('Response data:', responseData);
      } catch (e) {
        console.error('Error parsing response:', e);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(jsonData);
  req.end();
}

testRegistration(); 