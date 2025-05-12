// This is a standalone script to fix user profile data
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Create a simple mock database with the user
const mockDB = {
  users: [
    {
      id: 3,
      username: 'zenab',
      email: 'zainab@gmail.com'
    }
  ],
  skills: [],
  recent_activity: [],
  course_progress: [],
  notifications: []
};

// Add default data for the user
function addDefaultData() {
  const userId = 3; // Hardcoded for user 'zenab'

  // Add skills
  const skills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'];
  skills.forEach(skill => {
    mockDB.skills.push({
      user_id: userId,
      skill: skill
    });
  });

  // Add activity
  mockDB.recent_activity.push({
    user_id: userId,
    activity: 'Joined LearnX platform',
    timestamp: new Date()
  });

  // Add course progress
  mockDB.course_progress.push({
    user_id: userId,
    course_name: 'Web Development Basics',
    progress: 60
  });
  mockDB.course_progress.push({
    user_id: userId,
    course_name: 'JavaScript Fundamentals',
    progress: 45
  });

  // Add notifications
  mockDB.notifications.push({
    user_id: userId,
    notification: 'Welcome to LearnX! Complete your profile to get started.',
    timestamp: new Date()
  });

  return {
    message: 'Default data added successfully',
    user: mockDB.users.find(u => u.id === userId),
    skills: mockDB.skills.filter(s => s.user_id === userId).map(s => s.skill),
    activity: mockDB.recent_activity.filter(a => a.user_id === userId),
    courseProgress: mockDB.course_progress.filter(c => c.user_id === userId)
  };
}

// Create simple API endpoint
app.get('/fix-profile', (req, res) => {
  const result = addDefaultData();
  console.log('Added default data:', result);
  res.json(result);
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Fix profile server running on http://localhost:${PORT}`);
  console.log('Open http://localhost:3001/fix-profile in your browser to add default data');
}); 