const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Assuming you have a models directory

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Please enter both username and password' });
        }

        // Find the user by username
        const user = await User.findOne({ username });

        // Check if user exists and password is correct (you'll need to implement password hashing and comparison)
        if (!user || user.password !== password) { // Replace with secure password comparison
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // If login is successful, you might want to generate a token or set a session
        res.status(200).json({ message: 'Login successful' });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'An error occurred during login' });
    }
});

module.exports = router;