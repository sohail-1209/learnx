const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to check if the password works with psql
function testPsqlPassword(password) {
  try {
    // Try to run a simple query with psql
    execSync(`psql -U postgres -d learnx -c "SELECT 1" -w`, { 
      env: { ...process.env, PGPASSWORD: password },
      stdio: ['ignore', 'ignore', 'ignore'] 
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to update the .env file
function updateEnvFile(password) {
  try {
    let envContent = '';
    
    // Try to read existing .env file
    try {
      envContent = fs.readFileSync('.env', 'utf8');
      
      // Replace password line
      envContent = envContent.replace(/DB_PASSWORD=.*$/m, `DB_PASSWORD=${password}`);
    } catch (err) {
      // If .env doesn't exist, create it with default content
      envContent = `# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=learnx
DB_PASSWORD=${password}
DB_PORT=5432

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=learnx_secure_jwt_secret_key
JWT_EXPIRES_IN=7d`;
    }
    
    // Write the updated content
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file updated successfully!');
  } catch (err) {
    console.error('❌ Error updating .env file:', err);
  }
}

// Main function
function main() {
  console.log('This script will help you set up the database connection.');
  console.log('Please enter the same password you use for psql commands.\n');
  
  rl.question('Enter your PostgreSQL password: ', (password) => {
    console.log('\nTesting connection...');
    
    if (testPsqlPassword(password)) {
      console.log('✅ Connection test successful!');
      updateEnvFile(password);
      console.log('\nYour database configuration is now set up.');
      console.log('You can start the server using "npm run dev"');
    } else {
      console.log('❌ Connection test failed. Please check your password and try again.');
    }
    
    rl.close();
  });
}

main(); 