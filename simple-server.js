const express = require('express');
const path = require('path');

const app = express();

// Serve static files
app.use('/', express.static(path.join(__dirname, 'learnx-frontend')));

// Route for any other path - serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'learnx-frontend', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Simple static server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
}); 