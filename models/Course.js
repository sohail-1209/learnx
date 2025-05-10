// models/Course.js
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to the mentor user
    // Add other fields as needed (e.g., topics, duration, price)
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;