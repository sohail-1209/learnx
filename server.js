const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
require('dotenv').config();

const app = express();

// PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user.rows.length) return done(null, false);
    const isValid = await bcrypt.compare(password, user.rows[0].password);
    return isValid ? done(null, user.rows[0]) : done(null, false);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (err) {
    done(err);
  }
});

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/home.html'));
});
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/signup.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/profile.html'));
});
app.get('/marketplace', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/marketplace.html'));
});
app.get('/book-session', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/book-session.html'));
});
app.get('/schedule', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/schedule.html'));
});
app.get('/live-session', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/live-session.html'));
});
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/chat.html'));
});
app.get('/wallet', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/wallet.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});
// Add after existing routes
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/settings.html'));
});

app.get('/todo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/todo.html'));
});

app.get('/about-faq-support', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/about-faq-support.html'));
});
// Login route
app.post('/api/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({
        success: true,
        redirect: '/profile.html',
        user: { id: user.id, email: user.email }
      });
    });
  })(req, res, next);
});

// Signup route
app.post('/api/auth/signup', upload.single('profile_photo'), async (req, res) => {
  try {
    const { name, email, password, confirm_password, role, username, bio, skills } = req.body;

    if (!password || password !== confirm_password) {
      return res.status(400).json({ error: 'Password validation failed', redirect: '/signup' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    // Check for existing user
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [normalizedEmail, normalizedUsername]
    );
    if (existing.rows.length) {
      return res.status(400).json({ error: 'Email or username already exists!', redirect: '/signup' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'learner',
      username: normalizedUsername,
      bio: bio ? bio.trim() : null,
      skills: skills ? skills.split(',').map(s => s.trim()) : [],
      profile_photo: req.file ? `/uploads/${req.file.filename}` : null
    };

    const result = await pool.query(
      `INSERT INTO users 
        (name, email, password, role, username, bio, skills, profile_photo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, email, username`,
      Object.values(newUser)
    );

    res.status(201).json({
      success: true,
      redirect: '/login.html',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.', redirect: '/signup' });
  }
});

// 404 handler
app.use((req, res) => {
  // Make sure 404.html exists in public folder
  const notFoundPath = path.join(__dirname, 'public/404.html');
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath);
  } else {
    res.status(404).send('404 Not Found');
  }
});

// General error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err);
  res.status(500).json({ error: 'Internal server error', redirect: '/' });
});

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const uploadDir = path.join(__dirname, 'public/uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
});
