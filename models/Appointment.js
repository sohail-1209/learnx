const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to the mentor
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to the learner
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['booked', 'completed', 'cancelled'], default: 'booked' },
    // Add other fields as needed (e.g., topic, session link)
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;