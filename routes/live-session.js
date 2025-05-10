// routes/live-session.js
const express = require('express');
const router = express.Router();
const Session = require('../models/Session'); // Assuming you have a models directory
const User = require('../models/User'); // Assuming you have a models directory

// GET session details by ID
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const session = await Session.findById(sessionId)
                                    .populate('mentor', 'username') // Populate mentor's username
                                    .populate('attendees', 'username'); // Populate attendees' usernames

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.status(200).json(session);
    } catch (error) {
        console.error('Error fetching session details:', error);
        res.status(500).json({ error: 'An error occurred while fetching session details' });
    }
});

// POST request to join a session (basic implementation)
router.post('/sessions/:sessionId/join', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const userId = req.body.userId; // Assuming userId is sent in the request body

        // Find the session and the user
        const session = await Session.findById(sessionId);
        const user = await User.findById(userId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add the user to the attendees list if not already present
        if (!session.attendees.includes(userId)) {
            session.attendees.push(userId);
            await session.save();
        }

        res.status(200).json({ message: 'Successfully joined the session' });

    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ error: 'An error occurred while joining the session' });
    }
});

module.exports = router;