const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Initialize the express app
const app = express();

// Use body-parser middleware to parse JSON bodies after app initialization
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS with specific options
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from the learnx-frontend directory
app.use(express.static(path.join(__dirname, 'learnx-frontend')));

// Also add a route for the root path to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'learnx-frontend', 'index.html'));
});

// SCHEDULE API ENDPOINT - Adding here to ensure it's registered
app.get('/api/schedule/:userId', (req, res) => {
  try {
    const userIdInt = parseInt(req.params.userId);
    console.log(`Schedule API called for user ID: ${userIdInt}`);

    // Get enrolled sessions for this user
    const enrolledSessions = mockDB.sessions.filter(session =>
      session.enrolled_students && session.enrolled_students.includes(userIdInt)
    );

    console.log(`Found ${enrolledSessions.length} enrolled sessions for user ${userIdInt}`);
    console.log("Enrolled sessions:", JSON.stringify(enrolledSessions, null, 2));

    // Ensure we have non-empty data for test user (ID 1)
    if (userIdInt === 1 && enrolledSessions.length === 0) {
      console.log("Test user had no sessions, adding them now");
      // Enroll the test user in multiple sessions for testing
      const sessionsToEnroll = [1, 3, 4];
      
      sessionsToEnroll.forEach(sessionId => {
        const session = mockDB.sessions.find(s => s.id === sessionId);
        if (session) {
          if (!session.enrolled_students.includes(userIdInt)) {
            session.enrolled_students.push(userIdInt);
            console.log(`Test user ${userIdInt} enrolled in session ${sessionId} (${session.title})`);
          }
        }
      });
      
      // Re-fetch the sessions after enrolling
      const updatedSessions = mockDB.sessions.filter(session =>
        session.enrolled_students.includes(userIdInt)
      );
      console.log(`After auto-enrollment: ${updatedSessions.length} sessions for user ${userIdInt}`);
      
      // Use the updated sessions list
      enrolledSessions.length = 0;
      updatedSessions.forEach(s => enrolledSessions.push(s));
    }

    // Transform enrolled sessions to upcoming sessions format
    const upcomingSessions = enrolledSessions.map(session => {
      // Find the teacher for this session
      const teacher = mockDB.users.find(user => user.id === session.teacher_id);
      const teacherName = teacher ? teacher.username : 'Unknown Teacher';

      return {
        id: session.id,
        title: session.title,
        instructor: teacherName,
        datetime: session.schedule,
        status: 'upcoming'
      };
    });

    console.log(`Transformed ${upcomingSessions.length} upcoming sessions:`, JSON.stringify(upcomingSessions, null, 2));

    // Get completed sessions history (could be based on past dates or completion status)
    const history = [];
    
    // Get user's availability settings (using default for now)
    const availability = {
      days: ['monday', 'wednesday', 'friday'],
      timeFrom: 9,
      timeTo: 17
    };

    const responseData = {
      upcomingSessions: upcomingSessions,
      history: history,
      availability: availability
    };

    console.log("Sending schedule response:", JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (err) {
    console.error('Error getting schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock database for testing
const mockDB = {
  users: [
    {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$10$YrTH2zTXZgZqiKh8OCuT/ORVAa6VcgCSTZSQwNrWGnYBcsgtT8Zlm' // hashed 'password123'
    },
    // Add any other users you found in the console logs
    {
      id: 5,
      username: 'samad',
      email: 'sohaily@gmail.com',
      password: '$2a$10$YrTH2zTXZgZqiKh8OCuT/ORVAa6VcgCSTZSQwNrWGnYBcsgtT8Zlm' // using same password for demo
    }
  ],
  recent_activity: [
    { user_id: 1, activity: 'Completed JavaScript Basics', timestamp: new Date() },
    { user_id: 1, activity: 'Started Advanced CSS course', timestamp: new Date() }
  ],
  course_progress: [
    { user_id: 1, course_name: 'JavaScript Fundamentals', progress: 75 },
    { user_id: 1, course_name: 'UI/UX Design Principles', progress: 40 }
  ],
  notifications: [
    { user_id: 1, notification: 'Your session with Alex is confirmed.', timestamp: new Date() },
    { user_id: 1, notification: 'New course recommendation: React Basics', timestamp: new Date() }
  ],
  skills: [
    { user_id: 1, skill: 'JavaScript' },
    { user_id: 1, skill: 'HTML/CSS' },
    { user_id: 1, skill: 'UI Design' }
  ],
  sessions: [
    {
      id: 1,
      title: 'JavaScript for Beginners',
      description: 'A beginner-level course to understand the fundamentals of JavaScript',
      teacher_id: 5, // samad user
      price: 25,
      category: 'Coding',
      duration: 60, // 60 minutes
      schedule: '2023-05-20T15:00:00Z',
      enrolled_students: [1]
    },
    {
      id: 2,
      title: 'UI/UX Design Basics',
      description: 'Learn the principles of user interface and user experience design',
      teacher_id: 1, // testuser
      price: 30,
      category: 'Design',
      duration: 90, // 90 minutes
      schedule: '2023-05-21T13:00:00Z',
      enrolled_students: [5]
    },
    {
      id: 3,
      title: 'React JS Fundamentals',
      description: 'Learn how to build modern web applications with React',
      teacher_id: 5, // samad user
      price: 35,
      category: 'Coding',
      duration: 120, // 120 minutes
      schedule: '2023-06-15T14:00:00Z',
      enrolled_students: []
    },
    {
      id: 4,
      title: 'Node.js Backend Development',
      description: 'Build scalable and robust backend services with Node.js',
      teacher_id: 5, // samad user
      price: 40,
      category: 'Coding',
      duration: 150, // 150 minutes
      schedule: '2023-06-25T10:00:00Z',
      enrolled_students: []
    },
    {
      id: 5,
      title: 'Advanced CSS and SASS',
      description: 'Take your styling skills to the next level with advanced CSS and SASS techniques',
      teacher_id: 1, // testuser
      price: 30,
      category: 'Design',
      duration: 90, // 90 minutes
      schedule: '2023-06-10T11:00:00Z',
      enrolled_students: []
    }
  ],
  teaching_profiles: [
    {
      user_id: 5,
      title: 'Full Stack Developer',
      description: 'Experienced developer with expertise in MERN stack',
      experience_years: 5,
      hourly_rate: 25,
      rating: 4.8,
      reviews: [
        { student_id: 1, rating: 5, comment: 'Great teacher!', date: new Date() }
      ],
      earnings: 1250,
      sessions_completed: 12
    },
    {
      user_id: 1,
      title: 'UI/UX Designer',
      description: 'Passionate about creating seamless user experiences',
      experience_years: 3,
      hourly_rate: 30,
      rating: 4.5,
      reviews: [
        { student_id: 5, rating: 4, comment: 'Very knowledgeable', date: new Date() }
      ],
      earnings: 950,
      sessions_completed: 8
    }
  ]
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Register User (Signup)
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password, skills: userSkills, bio, role } = req.body;
  const profilePhoto = req.body.profile_photo || 'https://placehold.co/150x150';

  try {
    // Check if email already exists
    const existingUser = mockDB.users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

    // Add user to mock database with additional fields
    const newUser = {
      id: mockDB.users.length + 1,
      username,
      email,
      password: hashedPassword,
      bio: bio || 'Web Developer | JavaScript Expert', // Use provided bio or default
      profile_picture_url: profilePhoto,
      role: role || 'learner'
    };
    
    console.log(`Creating new user with data:`, {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      bio: newUser.bio,
      role: newUser.role,
      profile_picture: profilePhoto ? 'Provided' : 'Default'
    });
    
    mockDB.users.push(newUser);

    // Add skills for the new user
    if (userSkills && userSkills.length > 0) {
      // If user provided skills during registration, use those
      console.log(`Adding custom skills for new user:`, userSkills);
      userSkills.forEach(skill => {
        if (skill && skill.trim() !== '') {
          mockDB.skills.push({
            user_id: newUser.id,
            skill: skill
          });
        }
      });
    } else {
      // Otherwise use default skills
      const defaultSkills = ['HTML', 'CSS', 'JavaScript'];
      console.log(`Adding default skills for new user:`, defaultSkills);
      defaultSkills.forEach(skill => {
        mockDB.skills.push({
          user_id: newUser.id,
          skill: skill
        });
      });
    }

    // Add a default activity
    mockDB.recent_activity.push({
      user_id: newUser.id,
      activity: 'Joined LearnX platform',
      timestamp: new Date()
    });

    // Add default course progress
    mockDB.course_progress.push({
      user_id: newUser.id,
      course_name: 'Getting Started with LearnX',
      progress: 10
    });

    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
  } catch (err) {
    console.error('Error signing up user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const user = mockDB.users.find(user => user.email === email);

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Error logging in user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to ensure user has default data
function ensureUserHasDefaultData(userId) {
  const userIdInt = parseInt(userId);
  
  // Check if user exists
  const user = mockDB.users.find(user => user.id === userIdInt);
  if (!user) {
    console.log(`User ID ${userIdInt} not found in mockDB`);
    return false;
  }
  
  let dataAdded = false;

  // Check if user has skills
  const existingSkills = mockDB.skills.filter(item => item.user_id === userIdInt);
  
  // Only add default skills if no skills are found
  if (existingSkills.length === 0) {
    console.log(`No skills found for user ${userIdInt}, adding defaults`);
    const defaultSkills = ['HTML', 'CSS', 'JavaScript'];
    defaultSkills.forEach(skill => {
      mockDB.skills.push({
        user_id: userIdInt,
        skill: skill
      });
    });
    console.log(`Added default skills for user ${userIdInt}`);
    dataAdded = true;
  } else {
    console.log(`User ${userIdInt} already has ${existingSkills.length} skills, preserving them`);
  }

  // Check if user has course progress
  const existingProgress = mockDB.course_progress.filter(item => item.user_id === userIdInt);
  
  // Only add default course progress if none exists
  if (existingProgress.length === 0) {
    mockDB.course_progress.push({
      user_id: userIdInt,
      course_name: 'Getting Started with LearnX',
      progress: 10
    });
    console.log(`Added default course progress for user ${userIdInt}`);
    dataAdded = true;
  } else {
    console.log(`User ${userIdInt} already has course progress, preserving it`);
  }

  // Check if user has notifications
  const existingNotifications = mockDB.notifications.filter(item => item.user_id === userIdInt);
  
  // Only add default notifications if none exist
  if (existingNotifications.length === 0) {
    mockDB.notifications.push({
      user_id: userIdInt,
      notification: 'Welcome to LearnX! Complete your profile to get started.',
      timestamp: new Date()
    });
    console.log(`Added default notifications for user ${userIdInt}`);
    dataAdded = true;
  } else {
    console.log(`User ${userIdInt} already has notifications, preserving them`);
  }
  
  return dataAdded;
}

// Get Profile Information - update to properly use custom user data
app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const userIdInt = parseInt(userId);
  
  console.log(`Profile API called for user ID: ${userId} (parsed as ${userIdInt})`);

  try {
    // Find user
    const user = mockDB.users.find(user => user.id === userIdInt);

    if (!user) {
      console.log(`User ID ${userIdInt} not found in mockDB`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`Found user in mockDB:`, user);

    // Return user data (excluding password)
    const { password, ...userData } = user;
    
    // Set default values only if not provided during registration
    userData.bio = userData.bio || 'Web Developer | JavaScript Expert';
    userData.profile_picture_url = userData.profile_picture_url || 'https://placehold.co/150x150';
    userData.ratings = { average: 4.5, count: 15 };
    
    // FOR USER ID 5 SPECIFICALLY: Add skills directly
    if (userIdInt === 5) {
      console.log(`Special handling for user ID 5 (samad)`);
      userData.skills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'];
      userData.portfolio = [
        {
          title: 'Personal Portfolio',
          description: 'A showcase of my work',
          image: 'https://placehold.co/300x200'
        }
      ];
      userData.activity = [
        {
          text: 'Completed JavaScript course',
          time: '2 days ago'
        }
      ];
    } else {
      // For other users, get skills from mockDB
      const userSkills = mockDB.skills
        .filter(item => item.user_id === userIdInt)
        .map(item => item.skill);
        
      console.log(`Found ${userSkills.length} skills for user ${userIdInt}:`, userSkills);
      
      // If no skills found, add default ones directly
      if (userSkills.length === 0) {
        console.log(`No skills found for user ${userIdInt}, adding defaults now`);
        const defaultSkills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'];
        defaultSkills.forEach(skill => {
          mockDB.skills.push({
            user_id: userIdInt,
            skill: skill
          });
        });
        // Update userSkills with the newly added skills
        userData.skills = defaultSkills;
      } else {
        userData.skills = userSkills;
      }
      
      userData.portfolio = [];
      userData.activity = [];
    }

    console.log(`Returning profile data for user ${userIdInt} with ${userData.skills.length} skills:`, userData.skills);
    res.json(userData);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Dashboard Data - update to properly use custom user data
app.get('/api/dashboard/:userId', async (req, res) => {
  const { userId } = req.params;
  const userIdInt = parseInt(userId);

  console.log(`Dashboard API called for user ID: ${userId} (parsed as ${userIdInt})`);

  try {
    // Check if user exists
    const user = mockDB.users.find(user => user.id === userIdInt);
    if (!user) {
      console.log(`User ID ${userIdInt} not found in mockDB`);
      return res.status(404).json({ error: 'User not found' });
    }

    // For user ID 5, return hardcoded data
    if (userIdInt === 5) {
      console.log(`Special handling for user ID 5 (samad)'s dashboard`);
      const data = {
        recentActivity: [
          { activity: 'Completed JavaScript Fundamentals', timestamp: new Date() },
          { activity: 'Started React course', timestamp: new Date() }
        ],
        courseProgress: [
          { course_name: 'JavaScript Fundamentals', progress: 85 },
          { course_name: 'React Basics', progress: 40 },
          { course_name: 'Node.js for Beginners', progress: 25 }
        ],
        notifications: [
          'Your course completion certificate is ready!',
          'New course recommendation: Advanced React Patterns',
          'Upcoming live session: Web Development Q&A - Tomorrow at 7 PM'
        ],
        skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js']
      };
      console.log(`Returning dashboard data for user ${userIdInt}:`, data);
      return res.json(data);
    }

    // For other users, proceed with normal logic
    // Ensure user has default data
    const dataAdded = ensureUserHasDefaultData(userIdInt);
    if (dataAdded) {
      console.log(`Added default data for user ${userIdInt} during dashboard fetch`);
    }

    // Get user data from mock database
    const recentActivity = mockDB.recent_activity.filter(item => item.user_id === userIdInt);
    const courseProgress = mockDB.course_progress.filter(item => item.user_id === userIdInt);
    const notifications = mockDB.notifications.filter(item => item.user_id === userIdInt);
    const skills = mockDB.skills.filter(item => item.user_id === userIdInt);

    console.log(`Found skills for user ${userIdInt}:`, skills);

    const userBio = user.bio || 'Web Developer | JavaScript Expert';
    const userProfilePic = user.profile_picture_url || 'https://placehold.co/150x150';

    const data = {
      recentActivity: recentActivity,
      courseProgress: courseProgress,
      notifications: notifications.map(item => item.notification),
      skills: skills.map(item => item.skill),
      user: {
        username: user.username,
        bio: userBio,
        profile_picture_url: userProfilePic,
        role: user.role || 'learner'
      }
    };

    console.log(`Returning dashboard data for user ${userIdInt}:`, data);
    res.json(data);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Utility endpoint to add default skills to an existing user
app.post('/api/utils/add-default-data/:userId', (req, res) => {
  const { userId } = req.params;
  const userIdInt = parseInt(userId);

  console.log(`Adding default data for user ID: ${userId} (parsed as ${userIdInt})`);

  try {
    // Check if user exists
    const user = mockDB.users.find(user => user.id === userIdInt);
    if (!user) {
      console.log(`User ID ${userIdInt} not found in mockDB - creating dummy user`);
      // If user doesn't exist, create a dummy one for demo purposes
      mockDB.users.push({
        id: userIdInt,
        username: `user${userIdInt}`,
        email: `user${userIdInt}@example.com`,
        password: 'dummy-password'
      });
      console.log(`Created dummy user with ID ${userIdInt}`);
    }

    // Check if user already has skills, and if so, don't replace them
    const existingSkills = mockDB.skills.filter(skill => skill.user_id === userIdInt);
    
    if (existingSkills.length === 0) {
      // Only add default skills if the user doesn't have any
      console.log(`No skills found for user ${userIdInt}, adding defaults`);
      const defaultSkills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'];
      defaultSkills.forEach(skill => {
        mockDB.skills.push({
          user_id: userIdInt,
          skill: skill
        });
      });
      console.log(`Added default skills for user ${userIdInt}`);
    } else {
      console.log(`User ${userIdInt} already has ${existingSkills.length} skills, preserving them`);
    }

    // Add activities only if none exist
    const existingActivities = mockDB.recent_activity.filter(activity => activity.user_id === userIdInt);
    if (existingActivities.length === 0) {
      mockDB.recent_activity.push({
        user_id: userIdInt,
        activity: 'Joined LearnX platform',
        timestamp: new Date()
      });
      mockDB.recent_activity.push({
        user_id: userIdInt,
        activity: 'Completed profile setup',
        timestamp: new Date()
      });
      console.log(`Added activities for user ${userIdInt}`);
    } else {
      console.log(`User ${userIdInt} already has activities, preserving them`);
    }

    // Add course progress only if none exists
    const existingProgress = mockDB.course_progress.filter(progress => progress.user_id === userIdInt);
    if (existingProgress.length === 0) {
      mockDB.course_progress.push({
        user_id: userIdInt,
        course_name: 'Web Development Basics',
        progress: 60
      });
      mockDB.course_progress.push({
        user_id: userIdInt,
        course_name: 'JavaScript Fundamentals',
        progress: 45
      });
      console.log(`Added course progress for user ${userIdInt}`);
    } else {
      console.log(`User ${userIdInt} already has course progress, preserving it`);
    }

    // Add notifications only if none exist
    const existingNotifications = mockDB.notifications.filter(notification => notification.user_id === userIdInt);
    if (existingNotifications.length === 0) {
      mockDB.notifications.push({
        user_id: userIdInt,
        notification: 'Welcome to LearnX! Complete your profile to get started.',
        timestamp: new Date()
      });
      console.log(`Added notifications for user ${userIdInt}`);
    } else {
      console.log(`User ${userIdInt} already has notifications, preserving them`);
    }

    const updatedSkills = mockDB.skills
      .filter(item => item.user_id === userIdInt)
      .map(item => item.skill);
    console.log(`Updated skills for user ${userIdInt}:`, updatedSkills);

    res.status(200).json({ 
      message: 'Default data added successfully',
      skills: updatedSkills,
      activity: mockDB.recent_activity.filter(item => item.user_id === userIdInt),
      courseProgress: mockDB.course_progress.filter(item => item.user_id === userIdInt)
    });
  } catch (err) {
    console.error('Error adding default data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Teach API Endpoints
app.get('/api/teach/:userId', (req, res) => {
  const { userId } = req.params;
  const userIdInt = parseInt(userId);

  console.log(`Teach API called for user ID: ${userId} (parsed as ${userIdInt})`);

  try {
    // Find user
    const user = mockDB.users.find(user => user.id === userIdInt);
    if (!user) {
      console.log(`User ID ${userIdInt} not found in mockDB`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get teaching profile
    let teachingProfile = mockDB.teaching_profiles.find(profile => profile.user_id === userIdInt);
    
    // If no teaching profile found, create a default one
    if (!teachingProfile) {
      console.log(`No teaching profile found for user ${userIdInt}, creating a default one`);
      teachingProfile = {
        user_id: userIdInt,
        title: 'New Teacher',
        description: 'Start adding your teaching description',
        experience_years: 0,
        hourly_rate: 20,
        rating: 0,
        reviews: [],
        earnings: 0,
        sessions_completed: 0
      };
      mockDB.teaching_profiles.push(teachingProfile);
    }

    // Get sessions taught by this user
    const sessions = mockDB.sessions.filter(session => session.teacher_id === userIdInt);

    // Return teaching data
    const responseData = {
      profile: teachingProfile,
      sessions: sessions,
      username: user.username,
      profile_picture_url: user.profile_picture_url || 'https://placehold.co/150x150'
    };

    console.log(`Returning teaching data for user ${userIdInt}:`, responseData);
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching teach data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Learn API Endpoints
app.get('/api/learn/:userId', (req, res) => {
  const { userId } = req.params;
  const userIdInt = parseInt(userId);

  console.log(`Learn API called for user ID: ${userId} (parsed as ${userIdInt})`);

  try {
    // Find user
    let user = mockDB.users.find(user => user.id === userIdInt);
    if (!user) {
      console.log(`User ID ${userIdInt} not found in mockDB - creating temporary user`);
      // Create a temporary user for demo purposes
      user = {
        id: userIdInt,
        username: `user${userIdInt}`,
        email: `user${userIdInt}@example.com`,
        password: 'demo-password', // Not a real password, just for demo
        bio: 'LearnX User',
        profile_picture_url: 'https://placehold.co/150x150',
        role: 'learner'
      };
      mockDB.users.push(user);
      console.log(`Created temporary user with ID ${userIdInt}`);
      
      // Add default skills
      const defaultSkills = ['HTML', 'CSS', 'JavaScript'];
      defaultSkills.forEach(skill => {
        mockDB.skills.push({
          user_id: userIdInt,
          skill: skill
        });
      });
      
      // Add a default activity
      mockDB.recent_activity.push({
        user_id: userIdInt,
        activity: 'Joined LearnX platform',
        timestamp: new Date()
      });
      
      // Add default course progress
      mockDB.course_progress.push({
        user_id: userIdInt,
        course_name: 'Getting Started with LearnX',
        progress: 10
      });
    }

    // Get enrolled sessions
    const enrolledSessions = mockDB.sessions.filter(session => 
      session.enrolled_students.includes(userIdInt)
    );
    console.log(`Found ${enrolledSessions.length} enrolled sessions for user ${userIdInt}`);

    // Get course progress for this user
    const courseProgress = mockDB.course_progress.filter(course => course.user_id === userIdInt);
    console.log(`Found ${courseProgress.length} course progress entries for user ${userIdInt}`);

    // Make sure there are enough sessions in the mockDB
    if (mockDB.sessions.length < 3) {
      console.log("Adding some sample sessions to the mockDB");
      // Add a few more sample sessions if the mockDB doesn't have enough
      const newSessions = [
        {
          id: mockDB.sessions.length + 1,
          title: "React JS Fundamentals",
          description: "Learn the basics of React library for building user interfaces",
          teacher_id: 5, // samad user
          price: 35,
          category: "Coding",
          duration: 90,
          schedule: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          enrolled_students: [],
          max_students: null
        },
        {
          id: mockDB.sessions.length + 2,
          title: "Node.js Backend Development",
          description: "Build robust server-side applications with Node.js",
          teacher_id: 5, // samad user
          price: 40,
          category: "Coding",
          duration: 120,
          schedule: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          enrolled_students: [],
          max_students: null
        },
        {
          id: mockDB.sessions.length + 3,
          title: "Advanced CSS Techniques",
          description: "Master modern CSS layouts, animations, and responsive design",
          teacher_id: 1, // test user
          price: 30,
          category: "Design",
          duration: 60,
          schedule: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          enrolled_students: [],
          max_students: null
        }
      ];
      
      // Add the new sessions to the mockDB
      newSessions.forEach(session => {
        if (!mockDB.sessions.some(s => s.id === session.id)) {
          mockDB.sessions.push(session);
        }
      });
    }

    // Get all available sessions (excluding ones the user is already enrolled in)
    const availableSessions = mockDB.sessions.filter(session => 
      !session.enrolled_students.includes(userIdInt)
    );
    console.log(`Found ${availableSessions.length} available sessions for user ${userIdInt}`);
    
    // Log some details about the available sessions
    if (availableSessions.length > 0) {
      console.log("Available session details:");
      availableSessions.forEach(session => {
        console.log(`- ID: ${session.id}, Title: ${session.title}, Teacher: ${session.teacher_id}, Enrolled: ${session.enrolled_students.length}/${session.max_students || 'unlimited'}`);
      });
    } else {
      console.log("No available sessions found for this user");
    }

    // Get all teachers
    const teachers = mockDB.teaching_profiles.map(profile => ({
      user_id: profile.user_id,
      title: profile.title,
      rating: profile.rating,
      hourly_rate: profile.hourly_rate,
      username: mockDB.users.find(user => user.id === profile.user_id)?.username || 'Unknown'
    }));
    console.log(`Found ${teachers.length} teachers`);

    // If no teachers are found, add some default ones
    if (teachers.length === 0) {
      console.log("No teachers found, adding default ones");
      const defaultTeachers = [
        {
          user_id: 1,
          title: "Web Development Instructor",
          rating: 4.5,
          hourly_rate: 25,
          username: "testuser"
        },
        {
          user_id: 5,
          title: "Full Stack Developer",
          rating: 4.8,
          hourly_rate: 30,
          username: "samad"
        }
      ];
      teachers.push(...defaultTeachers);
    }

    // Return learning data
    const responseData = {
      enrolledSessions: enrolledSessions,
      courseProgress: courseProgress,
      availableSessions: availableSessions,
      teachers: teachers,
      username: user.username,
      profile_picture_url: user.profile_picture_url || 'https://placehold.co/150x150'
    };

    console.log(`Returning learning data for user ${userIdInt} with ${availableSessions.length} available sessions`);
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching learn data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Enroll in a session
app.post('/api/learn/enroll', (req, res) => {
  const { userId, sessionId } = req.body;
  const userIdInt = parseInt(userId);
  const sessionIdInt = parseInt(sessionId);

  console.log(`Enrolling user ${userIdInt} in session ${sessionIdInt}`);

  try {
    // Find user
    const user = mockDB.users.find(user => user.id === userIdInt);
    if (!user) {
      console.log(`User ID ${userIdInt} not found in mockDB`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Find session
    const session = mockDB.sessions.find(session => session.id === sessionIdInt);
    if (!session) {
      console.log(`Session ID ${sessionIdInt} not found in mockDB`);
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user is already enrolled
    if (session.enrolled_students.includes(userIdInt)) {
      console.log(`User ${userIdInt} already enrolled in session ${sessionIdInt}`);
      return res.status(400).json({ error: 'User already enrolled in this session' });
    }

    // Enroll user
    session.enrolled_students.push(userIdInt);

    console.log(`User ${userIdInt} enrolled in session ${sessionIdInt}`);
    res.status(200).json({ success: true, message: 'Enrolled successfully' });
  } catch (err) {
    console.error('Error enrolling in session:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Live Session API Endpoints
app.get('/api/live-session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const sessionIdInt = parseInt(sessionId);

  console.log(`Live Session API called for session ID: ${sessionId} (parsed as ${sessionIdInt})`);

  try {
    // Find session
    const session = mockDB.sessions.find(session => session.id === sessionIdInt);
    if (!session) {
      console.log(`Session ID ${sessionIdInt} not found in mockDB`);
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get teacher info
    const teacherProfile = mockDB.teaching_profiles.find(profile => profile.user_id === session.teacher_id);
    const teacher = mockDB.users.find(user => user.id === session.teacher_id);

    // Get enrolled students
    const students = session.enrolled_students.map(studentId => {
      const student = mockDB.users.find(user => user.id === studentId);
      return {
        id: studentId,
        username: student ? student.username : `Student ${studentId}`,
        profile_picture_url: student ? (student.profile_picture_url || 'https://placehold.co/150x150') : 'https://placehold.co/150x150'
      };
    });

    // Return session data
    const responseData = {
      session: session,
      teacher: {
        id: teacher.id,
        username: teacher.username,
        profile_picture_url: teacher.profile_picture_url || 'https://placehold.co/150x150',
        title: teacherProfile ? teacherProfile.title : 'Teacher',
        rating: teacherProfile ? teacherProfile.rating : 0
      },
      students: students
    };

    console.log(`Returning live session data for session ${sessionIdInt}`);
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching live session data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// User session data endpoint
app.get('/api/user/:userId/sessions', (req, res) => {
  const { userId } = req.params;
  const userIdInt = parseInt(userId);

  console.log(`User sessions API called for user ID: ${userId} (parsed as ${userIdInt})`);

  try {
    // Find user
    const user = mockDB.users.find(user => user.id === userIdInt);
    if (!user) {
      console.log(`User ID ${userIdInt} not found in mockDB`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get sessions where user is a teacher
    const teachingSessions = mockDB.sessions.filter(session => session.teacher_id === userIdInt);

    // Get sessions where user is a student
    const learningSessions = mockDB.sessions.filter(session => 
      session.enrolled_students.includes(userIdInt)
    );

    // Return session data
    const responseData = {
      teaching: teachingSessions,
      learning: learningSessions
    };

    console.log(`Returning sessions for user ${userIdInt}`);
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching user sessions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new teaching session
app.post('/api/teach/create-session', (req, res) => {
  const { userId, title, description, category, price, duration, schedule, maxStudents } = req.body;
  const userIdInt = parseInt(userId);

  console.log(`Creating teaching session for user ${userIdInt} with data:`, {
    title,
    description,
    category,
    price,
    duration,
    schedule
  });

  try {
    // Check if user exists
    const user = mockDB.users.find(user => user.id === userIdInt);
    if (!user) {
      console.log(`User ID ${userIdInt} not found in mockDB`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a new session
    const newSession = {
      id: mockDB.sessions.length > 0 ? Math.max(...mockDB.sessions.map(s => s.id)) + 1 : 1,
      title,
      description,
      teacher_id: userIdInt,
      price: parseFloat(price),
      category,
      duration: parseInt(duration),
      schedule: new Date(schedule).toISOString(),
      enrolled_students: [],
      max_students: maxStudents || 10
    };

    // Add to sessions
    mockDB.sessions.push(newSession);

    // Check if the user has a teaching profile
    let teachingProfile = mockDB.teaching_profiles.find(profile => profile.user_id === userIdInt);
    
    // If no teaching profile found, create a default one
    if (!teachingProfile) {
      teachingProfile = {
        user_id: userIdInt,
        title: 'Teacher',
        description: 'Start adding your teaching description',
        experience_years: 0,
        hourly_rate: price,
        rating: 0,
        reviews: [],
        earnings: 0,
        sessions_completed: 0
      };
      mockDB.teaching_profiles.push(teachingProfile);
      console.log(`Created teaching profile for user ${userIdInt}`);
    }

    console.log(`Created session for user ${userIdInt}:`, newSession);
    res.status(201).json({ success: true, session: newSession });
  } catch (err) {
    console.error('Error creating teaching session:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add Review for a Teacher
app.post('/api/reviews', (req, res) => {
  const { teacherId, studentId, sessionId, rating, comment } = req.body;
  
  try {
    // Validate inputs
    if (!teacherId || !studentId || !sessionId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if the rating is valid (between 1 and 5)
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Find the teacher profile
    const teacherProfileIndex = mockDB.teaching_profiles.findIndex(profile => profile.user_id === Number(teacherId));
    if (teacherProfileIndex === -1) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }
    
    // Find the session
    const session = mockDB.sessions.find(s => s.id === Number(sessionId));
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify that the student is enrolled in the session
    if (!session.enrolled_students.includes(Number(studentId))) {
      return res.status(403).json({ error: 'Student is not enrolled in this session' });
    }
    
    // Create the review
    const newReview = {
      student_id: Number(studentId),
      rating: Number(rating),
      comment: comment || '',
      date: new Date(),
      session_id: Number(sessionId)
    };
    
    // Add the review to the teacher's profile
    mockDB.teaching_profiles[teacherProfileIndex].reviews.push(newReview);
    
    // Update the teacher's average rating
    const reviews = mockDB.teaching_profiles[teacherProfileIndex].reviews;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    mockDB.teaching_profiles[teacherProfileIndex].rating = parseFloat(averageRating.toFixed(1));
    
    // Optionally, mark the session as reviewed by this student
    if (!session.reviewed_by) {
      session.reviewed_by = [];
    }
    if (!session.reviewed_by.includes(Number(studentId))) {
      session.reviewed_by.push(Number(studentId));
    }
    
    // Return success
    return res.status(201).json({ 
      success: true, 
      message: 'Review submitted successfully',
      review: newReview
    });
    
  } catch (error) {
    console.error('Error submitting review:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Reviews for a Teacher
app.get('/api/reviews/teacher/:teacherId', (req, res) => {
  const teacherId = Number(req.params.teacherId);
  
  try {
    // Find the teacher profile
    const teacherProfile = mockDB.teaching_profiles.find(profile => profile.user_id === teacherId);
    
    if (!teacherProfile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }
    
    // Get the teacher's name from users collection
    const teacher = mockDB.users.find(user => user.id === teacherId);
    const teacherName = teacher ? teacher.username : 'Unknown Teacher';
    
    // Get all reviews
    const reviews = teacherProfile.reviews || [];
    
    // Get student names for each review
    const reviewsWithStudentNames = reviews.map(review => {
      const student = mockDB.users.find(user => user.id === review.student_id);
      const studentName = student ? student.username : 'Anonymous Student';
      
      // Get session details
      const session = mockDB.sessions.find(s => s.id === review.session_id);
      const sessionTitle = session ? session.title : 'Unknown Session';
      
      return {
        ...review,
        studentName,
        sessionTitle
      };
    });
    
    return res.status(200).json({
      teacherId,
      teacherName,
      averageRating: teacherProfile.rating,
      totalReviews: reviews.length,
      reviews: reviewsWithStudentNames
    });
    
  } catch (error) {
    console.error('Error fetching teacher reviews:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test user credentials: email: test@example.com, password: password123`);
  
  // Enroll test user in some sessions for testing purposes
  console.log("Enrolling test user (ID 1) in multiple sessions for testing");
  
  // Make sure user 1 is enrolled in multiple sessions
  const testUserId = 1;
  const sessionsToEnroll = [1, 3, 4];
  
  sessionsToEnroll.forEach(sessionId => {
    const session = mockDB.sessions.find(s => s.id === sessionId);
    if (session) {
      if (!session.enrolled_students.includes(testUserId)) {
        session.enrolled_students.push(testUserId);
        console.log(`Test user ${testUserId} enrolled in session ${sessionId} (${session.title})`);
      } else {
        console.log(`Test user ${testUserId} already enrolled in session ${sessionId} (${session.title})`);
      }
    } else {
      console.log(`Session ${sessionId} not found`);
    }
  });
  
  // Log all sessions with enrolled students
  console.log("\nAll sessions with enrollments:");
  mockDB.sessions.forEach(session => {
    if (session.enrolled_students.length > 0) {
      console.log(`- Session ${session.id} (${session.title}): ${session.enrolled_students.length} enrolled - ${JSON.stringify(session.enrolled_students)}`);
    }
  });
});
