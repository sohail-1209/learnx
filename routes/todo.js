/**
 * LearnX - Todo Routes
 * Handles task management for users
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken } = require('../middleware/auth');

// Get user's todos
router.get('/', verifyToken, async (req, res) => {
  try {
    const { completed } = req.query;
    
    let query = `
      SELECT id, title, description, due_date, priority, is_completed, created_at
      FROM todos
      WHERE user_id = $1
    `;
    
    const queryParams = [req.userId];
    
    // Filter by completion status if specified
    if (completed === 'true') {
      query += ' AND is_completed = TRUE';
    } else if (completed === 'false') {
      query += ' AND is_completed = FALSE';
    }
    
    // Sort by due date and priority
    query += ' ORDER BY due_date ASC, CASE WHEN priority = \'high\' THEN 1 WHEN priority = \'medium\' THEN 2 ELSE 3 END';
    
    const result = await pool.query(query, queryParams);
    
    res.status(200).json({ todos: result.rows });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Server error fetching todos' });
  }
});

// Create a new todo
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    
    // Validate input
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Create todo
    const result = await pool.query(
      `INSERT INTO todos (user_id, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, due_date, priority, is_completed`,
      [req.userId, title, description, dueDate, priority || 'medium']
    );
    
    res.status(201).json({
      message: 'Todo created successfully',
      todo: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Server error creating todo' });
  }
});

// Update a todo
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const todoId = req.params.id;
    const { title, description, dueDate, priority, isCompleted } = req.body;
    
    // Check if todo exists and belongs to the user
    const todoCheck = await pool.query(
      'SELECT id FROM todos WHERE id = $1 AND user_id = $2',
      [todoId, req.userId]
    );
    
    if (todoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found or does not belong to this user' });
    }
    
    // Update todo
    await pool.query(
      `UPDATE todos 
       SET title = $1, description = $2, due_date = $3, priority = $4, is_completed = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [title, description, dueDate, priority, isCompleted, todoId]
    );
    
    res.status(200).json({ message: 'Todo updated successfully' });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Server error updating todo' });
  }
});

// Toggle completion status
router.put('/:id/toggle', verifyToken, async (req, res) => {
  try {
    const todoId = req.params.id;
    
    // Check if todo exists and belongs to the user
    const todoCheck = await pool.query(
      'SELECT id, is_completed FROM todos WHERE id = $1 AND user_id = $2',
      [todoId, req.userId]
    );
    
    if (todoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found or does not belong to this user' });
    }
    
    const currentStatus = todoCheck.rows[0].is_completed;
    
    // Toggle completion status
    await pool.query(
      `UPDATE todos 
       SET is_completed = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [!currentStatus, todoId]
    );
    
    res.status(200).json({ 
      message: `Todo marked as ${!currentStatus ? 'completed' : 'incomplete'}`,
      isCompleted: !currentStatus
    });
  } catch (error) {
    console.error('Error toggling todo completion:', error);
    res.status(500).json({ error: 'Server error updating todo' });
  }
});

// Delete a todo
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const todoId = req.params.id;
    
    // Check if todo exists and belongs to the user
    const todoCheck = await pool.query(
      'SELECT id FROM todos WHERE id = $1 AND user_id = $2',
      [todoId, req.userId]
    );
    
    if (todoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found or does not belong to this user' });
    }
    
    // Delete todo
    await pool.query('DELETE FROM todos WHERE id = $1', [todoId]);
    
    res.status(200).json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Server error deleting todo' });
  }
});

// Get todo statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    // Get total count
    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM todos WHERE user_id = $1',
      [req.userId]
    );
    
    // Get completed count
    const completedResult = await pool.query(
      'SELECT COUNT(*) FROM todos WHERE user_id = $1 AND is_completed = TRUE',
      [req.userId]
    );
    
    // Get upcoming due todos
    const now = new Date();
    const upcomingResult = await pool.query(
      `SELECT COUNT(*) FROM todos 
       WHERE user_id = $1 AND is_completed = FALSE AND due_date > $2 AND due_date <= $3`,
      [req.userId, now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)] // 7 days
    );
    
    // Get overdue todos
    const overdueResult = await pool.query(
      'SELECT COUNT(*) FROM todos WHERE user_id = $1 AND is_completed = FALSE AND due_date < $2',
      [req.userId, now]
    );
    
    // Get todos by priority
    const priorityResult = await pool.query(
      `SELECT priority, COUNT(*) FROM todos 
       WHERE user_id = $1 AND is_completed = FALSE
       GROUP BY priority`,
      [req.userId]
    );
    
    const priorities = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    priorityResult.rows.forEach(row => {
      priorities[row.priority] = parseInt(row.count);
    });
    
    res.status(200).json({
      total: parseInt(totalResult.rows[0].count),
      completed: parseInt(completedResult.rows[0].count),
      upcoming: parseInt(upcomingResult.rows[0].count),
      overdue: parseInt(overdueResult.rows[0].count),
      priorities
    });
  } catch (error) {
    console.error('Error fetching todo statistics:', error);
    res.status(500).json({ error: 'Server error fetching todo statistics' });
  }
});

module.exports = router; 