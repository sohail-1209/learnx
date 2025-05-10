// routes/schedule.js
const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment'); // Assuming you have a models directory
const User = require('../models/User'); // Assuming you have a models directory

// Middleware to protect schedule routes (recommended)
function isAuthenticated(req, res, next) {
    // Implement your authentication logic here
    next();
}

// GET appointments for a user (mentor or learner)
router.get('/users/:userId/appointments', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find appointments where the user is either the mentor or the learner
        const appointments = await Appointment.find({ $or: [{ mentor: userId }, { learner: userId }] })
                                            .populate('mentor', 'username') // Populate mentor's username
                                            .populate('learner', 'username') // Populate learner's username
                                            .sort('startTime'); // Sort by start time

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'An error occurred while fetching appointments' });
    }
});

// POST to create a new appointment
router.post('/appointments', isAuthenticated, async (req, res) => {
    try {
        const { mentorId, learnerId, startTime, endTime } = req.body; // Assuming necessary data is sent in the request body

        // Basic validation
        if (!mentorId || !learnerId || !startTime || !endTime) {
            return res.status(400).json({ error: 'Please provide mentor, learner, start time, and end time' });
        }

        // Check if mentor and learner exist
        const mentor = await User.findById(mentorId);
        const learner = await User.findById(learnerId);

        if (!mentor || !learner) {
            return res.status(404).json({ error: 'Mentor or learner not found' });
        }

        // Create a new appointment
        const newAppointment = new Appointment({
            mentor: mentorId,
            learner: learnerId,
            startTime,
            endTime,
        });

        await newAppointment.save();

        res.status(201).json({ message: 'Appointment created successfully', appointment: newAppointment });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'An error occurred while creating the appointment' });
    }
});

module.exports = router;