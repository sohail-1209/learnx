// routes/todo.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task'); // Assuming you have a models directory
const User = require('../models/User'); // Assuming you have a models directory

// Middleware to protect todo routes (recommended)
function isAuthenticated(req, res, next) {
    // Implement your authentication logic here
    next();
}

// POST to create a new task
router.post('/tasks', isAuthenticated, async (req, res) => {
    try {
        const { description, userId } = req.body; // Assuming necessary data is sent in the request body

        // Basic validation
        if (!description || !userId) {
            return res.status(400).json({ error: 'Please provide task description and user ID' });
        }

        // Check if the user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create a new task
        const newTask = new Task({
            user: userId,
            description,
        });

        await newTask.save();

        res.status(201).json({ message: 'Task created successfully', task: newTask });

    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'An error occurred while creating the task' });
    }
});

// GET tasks for a specific user
router.get('/users/:userId/tasks', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find tasks by user ID, sorted by creation date
        const tasks = await Task.find({ user: userId }).sort('createdAt');

        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).json({ error: 'An error occurred while fetching user tasks' });
    }
});

// PUT or PATCH to update a task by ID
router.put('/tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const updates = req.body; // Assuming updates are sent in the request body

        // Find the task by ID and update
        const task = await Task.findByIdAndUpdate(taskId, updates, { new: true, runValidators: true });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.status(200).json({ message: 'Task updated successfully', task });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'An error occurred while updating task' });
    }
});

// DELETE a task by ID
router.delete('/tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
        const taskId = req.params.taskId;

        // Find the task by ID and delete
        const task = await Task.findByIdAndDelete(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'An error occurred while deleting task' });
    }
});

module.exports = router;