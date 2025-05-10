// routes/marketplace.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Assuming you have a models directory
const User = require('../models/User'); // Assuming you have a models directory

// GET all products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().populate('seller', 'username'); // Populate seller's username
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'An error occurred while fetching products' });
    }
});

// POST to create a new product listing
router.post('/products', async (req, res) => {
    try {
        const { name, description, price, sellerId } = req.body; // Assuming sellerId is sent in the request body

        // Basic validation
        if (!name || !price || !sellerId) {
            return res.status(400).json({ error: 'Please enter all required fields' });
        }

        // Check if the seller exists
        const seller = await User.findById(sellerId);
        if (!seller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        // Create a new product
        const newProduct = new Product({
            name,
            description,
            price,
            seller: sellerId,
        });

        await newProduct.save();

        res.status(201).json({ message: 'Product created successfully', product: newProduct });

    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'An error occurred while creating the product' });
    }
});

module.exports = router;