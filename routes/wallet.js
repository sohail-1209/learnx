/**
 * LearnX - Wallet Routes
 * Handles wallet management and financial transactions
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken } = require('../middleware/auth');

// Get user's wallet
router.get('/', verifyToken, async (req, res) => {
  try {
    // Get wallet details
    const walletResult = await pool.query(
      'SELECT id, balance FROM wallet WHERE user_id = $1',
      [req.userId]
    );
    
    if (walletResult.rows.length === 0) {
      // Create wallet if it doesn't exist
      const newWalletResult = await pool.query(
        'INSERT INTO wallet (user_id, balance) VALUES ($1, 0) RETURNING id, balance',
        [req.userId]
      );
      
      return res.status(200).json({
        wallet: {
          id: newWalletResult.rows[0].id,
          balance: parseFloat(newWalletResult.rows[0].balance),
          transactions: []
        }
      });
    }
    
    const wallet = walletResult.rows[0];
    
    // Get recent transactions
    const transactionsResult = await pool.query(
      `SELECT id, amount, type, description, reference_id, status, created_at
       FROM transactions
       WHERE wallet_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [wallet.id]
    );
    
    res.status(200).json({
      wallet: {
        id: wallet.id,
        balance: parseFloat(wallet.balance),
        transactions: transactionsResult.rows.map(tx => ({
          ...tx,
          amount: parseFloat(tx.amount)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Server error fetching wallet' });
  }
});

// Get transaction history
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;
    
    // Get wallet ID
    const walletResult = await pool.query(
      'SELECT id FROM wallet WHERE user_id = $1',
      [req.userId]
    );
    
    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const walletId = walletResult.rows[0].id;
    
    // Build query with optional type filter
    let query = `
      SELECT id, amount, type, description, reference_id, status, created_at
      FROM transactions
      WHERE wallet_id = $1
    `;
    
    const queryParams = [walletId];
    let paramIndex = 2;
    
    if (type) {
      query += ` AND type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    // Get transactions
    const transactionsResult = await pool.query(query, queryParams);
    
    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions WHERE wallet_id = $1 ${type ? 'AND type = $2' : ''}`,
      type ? [walletId, type] : [walletId]
    );
    
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    res.status(200).json({
      transactions: transactionsResult.rows.map(tx => ({
        ...tx,
        amount: parseFloat(tx.amount)
      })),
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Server error fetching transactions' });
  }
});

// Add funds to wallet
router.post('/deposit', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    // Get wallet ID
    const walletResult = await pool.query(
      'SELECT id FROM wallet WHERE user_id = $1',
      [req.userId]
    );
    
    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const walletId = walletResult.rows[0].id;
    
    // In a real app, we would integrate with a payment processor here
    // For demo purposes, we'll just add the funds directly
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update wallet balance
      await client.query(
        `UPDATE wallet 
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [amount, walletId]
      );
      
      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
         VALUES ($1, $2, 'deposit', 'Funds added to wallet', $3)
         RETURNING id`,
        [walletId, amount, `deposit-${Date.now()}`]
      );
      
      await client.query('COMMIT');
      
      // Get updated balance
      const updatedWalletResult = await pool.query(
        'SELECT balance FROM wallet WHERE id = $1',
        [walletId]
      );
      
      res.status(200).json({
        message: 'Funds added successfully',
        transaction: {
          id: transactionResult.rows[0].id,
          amount: parseFloat(amount),
          type: 'deposit'
        },
        newBalance: parseFloat(updatedWalletResult.rows[0].balance)
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding funds:', error);
    res.status(500).json({ error: 'Server error adding funds' });
  }
});

// Withdraw funds from wallet
router.post('/withdraw', verifyToken, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }
    
    // Get wallet details
    const walletResult = await pool.query(
      'SELECT id, balance FROM wallet WHERE user_id = $1',
      [req.userId]
    );
    
    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const wallet = walletResult.rows[0];
    const balance = parseFloat(wallet.balance);
    
    // Check if user has enough balance
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // In a real app, we would integrate with a payment processor here
    // For demo purposes, we'll just subtract the funds
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update wallet balance
      await client.query(
        `UPDATE wallet 
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [amount, wallet.id]
      );
      
      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (wallet_id, amount, type, description, reference_id)
         VALUES ($1, $2, 'withdrawal', $3, $4)
         RETURNING id`,
        [wallet.id, amount, `Withdrawal to ${paymentMethod}`, `withdrawal-${Date.now()}`]
      );
      
      await client.query('COMMIT');
      
      // Get updated balance
      const updatedWalletResult = await pool.query(
        'SELECT balance FROM wallet WHERE id = $1',
        [wallet.id]
      );
      
      res.status(200).json({
        message: 'Withdrawal successful',
        transaction: {
          id: transactionResult.rows[0].id,
          amount: parseFloat(amount),
          type: 'withdrawal'
        },
        newBalance: parseFloat(updatedWalletResult.rows[0].balance)
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error withdrawing funds:', error);
    res.status(500).json({ error: 'Server error withdrawing funds' });
  }
});

// Get earnings statistics (for teachers)
router.get('/earnings', verifyToken, async (req, res) => {
  try {
    // Check if user is a teacher
    const userCheck = await pool.query(
      'SELECT is_teacher FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (!userCheck.rows[0].is_teacher) {
      return res.status(403).json({ error: 'Only teachers can access earnings statistics' });
    }
    
    // Get wallet ID
    const walletResult = await pool.query(
      'SELECT id FROM wallet WHERE user_id = $1',
      [req.userId]
    );
    
    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const walletId = walletResult.rows[0].id;
    
    // Get total earnings
    const totalEarningsResult = await pool.query(
      `SELECT SUM(amount) FROM transactions 
       WHERE wallet_id = $1 AND type = 'earning'`,
      [walletId]
    );
    
    const totalEarnings = parseFloat(totalEarningsResult.rows[0].sum || 0);
    
    // Get earnings by month for the last 6 months
    const monthlyEarningsResult = await pool.query(
      `SELECT 
         TO_CHAR(created_at, 'YYYY-MM') AS month,
         SUM(amount) AS total
       FROM transactions 
       WHERE wallet_id = $1 AND type = 'earning' 
         AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month DESC`,
      [walletId]
    );
    
    // Get earnings breakdown by source (course/session)
    const sourceBreakdownResult = await pool.query(
      `SELECT 
         SPLIT_PART(description, ':', 1) AS source,
         SUM(amount) AS total
       FROM transactions 
       WHERE wallet_id = $1 AND type = 'earning'
       GROUP BY SPLIT_PART(description, ':', 1)`,
      [walletId]
    );
    
    const sourceBreakdown = {};
    sourceBreakdownResult.rows.forEach(row => {
      // Clean up source text by removing "Earning from" prefix
      const sourceName = row.source.replace('Earning from ', '');
      sourceBreakdown[sourceName] = parseFloat(row.total);
    });
    
    res.status(200).json({
      totalEarnings,
      monthlyEarnings: monthlyEarningsResult.rows.map(row => ({
        month: row.month,
        total: parseFloat(row.total)
      })),
      sourceBreakdown
    });
  } catch (error) {
    console.error('Error fetching earnings statistics:', error);
    res.status(500).json({ error: 'Server error fetching earnings statistics' });
  }
});

module.exports = router; 