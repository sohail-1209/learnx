const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to the user
    description: { type: String, required: true },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    // Add other fields as needed (e.g., due date, priority)
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;