const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'learnx-frontend' directory
app.use(express.static(path.join(__dirname, 'learnx-frontend')));

// Start the server on port 8080
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Static server running at http://localhost:${PORT}`);
  console.log(`You can access the following files:`);
  console.log(`- http://localhost:${PORT}/login.html`);
  console.log(`- http://localhost:${PORT}/register.html`);
  console.log(`- http://localhost:${PORT}/dashboard.html`);
}); 