const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Get all orders
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().populate('customerId workerId', 'name surname avatar');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create order
router.post('/', async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.json(order);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update order
router.put('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (order) res.json(order);
        else res.status(404).json({ message: 'Order not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
