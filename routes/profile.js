// routes/profile.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Assuming you have a models directory

// Middleware to protect profile routes (recommended)
function isAuthenticated(req, res, next) {
    // Implement your authentication logic here
    next();
}

// GET user profile by ID
router.get('/users/:userId/profile', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find the user by ID
        const user = await User.findById(userId).select('-password'); // Exclude password from the response

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'An error occurred while fetching user profile' });
    }
});

// PUT or PATCH to update user profile by ID
router.put('/users/:userId/profile', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;
        const updates = req.body; // Assuming updates are sent in the request body

        // Find the user by ID and update
        // Use { new: true } to return the updated document
        // Use { runValidators: true } to run schema validators on update
        const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-password'); // Exclude password

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'An error occurred while updating user profile' });
    }
});

module.exports = router;