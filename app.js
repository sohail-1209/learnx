const express = require('express');
const mongoose = require('mongoose');
const loginRoute = require('./routes/login'); // Assuming your login route file is in a 'routes' directory
const registerRoute = require('./routes/register');
const dashboardRoute = require('./routes/dashboard');
const learnRoute = require('./routes/learn');
const marketplaceRoute = require('./routes/marketplace');
const liveSessionRoute = require('./routes/live-session');
const scheduleRoute = require('./routes/schedule');
const profileRoute = require('./routes/profile');
const teachRoute = require('./routes/teach');
const settingsRoute = require('./routes/settings');
const walletRoute = require('./routes/wallet');
const todoRoute = require('./routes/todo');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/learnx', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Use the login route
app.use('/', loginRoute); // Mount the login route at the root path

// Use the register route
app.use('/', registerRoute);

// Use the dashboard route
app.use('/', dashboardRoute);

// Use the learn route
app.use('/', learnRoute);

// Use the live-session route
app.use('/', liveSessionRoute);

// Use the marketplace route
app.use('/', marketplaceRoute);

// Use the profile route
app.use('/', profileRoute);

// Use the schedule route
app.use('/', scheduleRoute);

// Use the settings route
app.use('/', settingsRoute);

// Use the teach route
app.use('/', teachRoute);

// Use the todo route
app.use('/', todoRoute);

// Use the wallet route
app.use('/', walletRoute);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});