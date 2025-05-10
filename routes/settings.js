// routes/settings.js
const express = require('express');
const router = express.Router();
const UserSetting = require('../models/UserSetting'); // Assuming you have a models directory
const User = require('../models/User'); // Assuming you have a models directory

// Middleware to protect settings routes (recommended)
function isAuthenticated(req, res, next) {
    // Implement your authentication logic here
    next();
}

// GET user settings by user ID
router.get('/users/:userId/settings', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find user settings by user ID
        const userSettings = await UserSetting.findOne({ user: userId }).populate('user', 'username'); // Populate user's username

        if (!userSettings) {
            // If settings don't exist, maybe create default settings
            const newUserSettings = new UserSetting({ user: userId });
            await newUserSettings.save();
            return res.status(200).json(newUserSettings);
        }

        res.status(200).json(userSettings);
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({ error: 'An error occurred while fetching user settings' });
    }
});

// PUT or PATCH to update user settings by user ID
router.put('/users/:userId/settings', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;
        const updates = req.body; // Assuming updates are sent in the request body

        // Find user settings by user ID and update
        const userSettings = await UserSetting.findOneAndUpdate({ user: userId }, updates, { new: true, upsert: true, runValidators: true }).populate('user', 'username'); // Use upsert: true to create if not found

        res.status(200).json({ message: 'Settings updated successfully', userSettings });
    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({ error: 'An error occurred while updating user settings' });
    }
});

module.exports = router;