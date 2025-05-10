// routes/wallet.js
const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet'); // Assuming you have a models directory
const Transaction = require('../models/Transaction'); // Assuming you have a models directory
const User = require('../models/User'); // Assuming you have a models directory

// Middleware to protect wallet routes (recommended)
function isAuthenticated(req, res, next) {
    // Implement your authentication logic here
    next();
}

// GET user wallet and transaction history by user ID
router.get('/users/:userId/wallet', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find the user's wallet
        let wallet = await Wallet.findOne({ user: userId }).populate('user', 'username'); // Populate user's username

        if (!wallet) {
            // If wallet doesn't exist, create one with a zero balance
            wallet = new Wallet({ user: userId });
            await wallet.save();
        }

        // Find transactions for the user, sorted by creation date
        const transactions = await Transaction.find({ user: userId }).sort('-createdAt'); // Sort by latest transactions

        res.status(200).json({ wallet, transactions });
    } catch (error) {
        console.error('Error fetching user wallet:', error);
        res.status(500).json({ error: 'An error occurred while fetching user wallet' });
    }
});

// POST to record a new transaction (basic implementation)
// This could be used for credits or debits related to platform activities
router.post('/transactions', isAuthenticated, async (req, res) => {
    try {
        const { userId, type, amount, description } = req.body; // Assuming necessary data is sent in the request body

        // Basic validation
        if (!userId || !type || !amount) {
            return res.status(400).json({ error: 'Please provide user ID, type, and amount' });
        }

        // Check if the user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the user's wallet
        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
             // If wallet doesn't exist, create one
            wallet = new Wallet({ user: userId });
            await wallet.save();
        }

        // Update wallet balance based on transaction type
        if (type === 'credit') {
            wallet.balance += amount;
        } else if (type === 'debit') {
            if (wallet.balance < amount) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            wallet.balance -= amount;
        } else {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        await wallet.save();

        // Create a new transaction record
        const newTransaction = new Transaction({
            user: userId,
            type,
            amount,
            description,
        });

        await newTransaction.save();

        res.status(201).json({ message: 'Transaction recorded successfully', transaction: newTransaction, wallet });

    } catch (error) {
        console.error('Error recording transaction:', error);
        res.status(500).json({ error: 'An error occurred while recording the transaction' });
    }
});

module.exports = router;