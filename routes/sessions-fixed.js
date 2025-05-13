/**
 * LearnX - Sessions Routes
 * Fixed version with correct route order
 * The user-defined routes must come BEFORE the parameterized routes
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken, isTeacher } = require('../middleware/auth');

// This is the correct order of routes:

// First all specific routes
router.get('/upcoming', async (req, res) => {
  // Route implementation
});

router.get('/available', async (req, res) => {
  // Route implementation 
});

// Critical user-defined routes BEFORE any parameterized routes
router.get('/booked', verifyToken, async (req, res) => {
  // Route implementation
});

router.get('/user-bookings', verifyToken, async (req, res) => {
  // Route implementation
});

router.get('/schedule/:userId', async (req, res) => {
  // Route implementation
});

// LAST: Any parameterized routes like /:id
router.get('/:id', async (req, res) => {
  // Route implementation
});

router.post('/:id/book', verifyToken, async (req, res) => {
  // Route implementation
});

module.exports = router; 