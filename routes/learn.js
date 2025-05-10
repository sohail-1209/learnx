const express = require('express');
const router = express.Router();
const Course = require('../models/Course'); // Assuming you have a models directory

// GET all courses
router.get('/courses', async (req, res) => {
    try {
        const courses = await Course.find().populate('mentor', 'username'); // Populate mentor's username
        res.status(200).json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'An error occurred while fetching courses' });
    }
});

// GET a specific course by ID
router.get('/courses/:courseId', async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId).populate('mentor', 'username'); // Populate mentor's username

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.status(200).json(course);
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).json({ error: 'An error occurred while fetching course details' });
    }
});

module.exports = router;