const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // Link to the user
    balance: { type: Number, default: 0 },
    // Add other wallet-related fields as needed (e.g., currency)
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;