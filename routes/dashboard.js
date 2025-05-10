const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Assuming you have a models directory
const Notification = require('../models/Notification'); // Assuming you have a models directory

// Placeholder middleware to protect dashboard routes (optional, but recommended for authenticated routes)
function isAuthenticated(req, res, next) {
    // Implement your authentication logic here (e.g., check for a valid token or session)
    // If the user is authenticated, call next()
    // If not, return a 401 Unauthorized response
    // For now, we'll just proceed without authentication for demonstration purposes
    next();
}

router.get('/dashboard/:userId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find notifications for the user, sorted by creation date
        const notifications = await Notification.find({ user: userId })
                                              .sort({ createdAt: -1 });

        // Return the dashboard data (user info and notifications)
        res.status(200).json({ user, notifications });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'An error occurred while fetching dashboard data' });
    }
});

module.exports = router;