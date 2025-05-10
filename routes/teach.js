// routes/teach.js
const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Session = require('../models/Session');
const Appointment = require('../models/Appointment');
const User = require('../models/User'); // Assuming you have a models directory

// Middleware to protect teaching routes (recommended)
function isAuthenticated(req, res, next) {
    // Implement your authentication logic here
    next();
}

// POST to create a new course
router.post('/courses', isAuthenticated, async (req, res) => {
    try {
        const { title, description, mentorId } = req.body; // Assuming necessary data is sent in the request body

        // Basic validation
        if (!title || !mentorId) {
            return res.status(400).json({ error: 'Please provide course title and mentor ID' });
        }

        // Check if the mentor exists
        const mentor = await User.findById(mentorId);
        if (!mentor) {
            return res.status(404).json({ error: 'Mentor not found' });
        }

        // Create a new course
        const newCourse = new Course({
            title,
            description,
            mentor: mentorId,
        });

        await newCourse.save();

        res.status(201).json({ message: 'Course created successfully', course: newCourse });

    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'An error occurred while creating the course' });
    }
});

// GET courses taught by a specific mentor
router.get('/users/:mentorId/courses', isAuthenticated, async (req, res) => {
    try {
        const mentorId = req.params.mentorId;

        // Find courses by mentor ID
        const courses = await Course.find({ mentor: mentorId }).populate('mentor', 'username'); // Populate mentor's username

        res.status(200).json(courses);
    } catch (error) {
        console.error('Error fetching mentor courses:', error);
        res.status(500).json({ error: 'An error occurred while fetching mentor courses' });
    }
});

// POST to create a new session
router.post('/sessions', isAuthenticated, async (req, res) => {
    try {
        const { title, mentorId, startTime, endTime } = req.body; // Assuming necessary data is sent in the request body

        // Basic validation
        if (!title || !mentorId || !startTime || !endTime) {
            return res.status(400).json({ error: 'Please provide session title, mentor ID, start time, and end time' });
        }

        // Check if the mentor exists
        const mentor = await User.findById(mentorId);
        if (!mentor) {
            return res.status(404).json({ error: 'Mentor not found' });
        }

        // Create a new session
        const newSession = new Session({
            title,
            mentor: mentorId,
            startTime,
            endTime,
        });

        await newSession.save();

        res.status(201).json({ message: 'Session created successfully', session: newSession });

    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'An error occurred while creating the session' });
    }
});

// GET sessions hosted by a specific mentor
router.get('/users/:mentorId/sessions', isAuthenticated, async (req, res) => {
    try {
        const mentorId = req.params.mentorId;

        // Find sessions by mentor ID
        const sessions = await Session.find({ mentor: mentorId }).populate('mentor', 'username'); // Populate mentor's username

        res.status(200).json(sessions);
    } catch (error) {
        console.error('Error fetching mentor sessions:', error);
        res.status(500).json({ error: 'An error occurred while fetching mentor sessions' });
    }
});

// You might also want routes to manage appointments related to teaching
// For example, getting appointments where the user is the mentor
router.get('/users/:mentorId/teaching-appointments', isAuthenticated, async (req, res) => {
    try {
        const mentorId = req.params.mentorId;

        // Find appointments where the user is the mentor
        const appointments = await Appointment.find({ mentor: mentorId })
                                            .populate('learner', 'username') // Populate learner's username
                                            .sort('startTime'); // Sort by start time

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error fetching mentor appointments:', error);
        res.status(500).json({ error: 'An error occurred while fetching mentor appointments' });
    }
});


module.exports = router;