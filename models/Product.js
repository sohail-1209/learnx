const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to the seller user
    // Add other fields as needed (e.g., category, image URL, quantity)
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;