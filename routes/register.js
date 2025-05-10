const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Assuming you have a models directory

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please enter all required fields' });
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ error: 'User with this username or email already exists' });
        }

        // Create a new user (you'll need to implement password hashing before saving)
        const newUser = new User({
            username,
            email,
            password, // Hash the password before saving
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'An error occurred during registration' });
    }
});

module.exports = router;