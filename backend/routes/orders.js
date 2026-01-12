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
        const orderData = { ...req.body };

        // Agar workerId kelsa, avtomatik ACCEPTED qilish va vaqtni saqlash
        if (orderData.workerId) {
            orderData.status = 'ACCEPTED';
            orderData.acceptedAt = new Date();
        }

        const order = new Order(orderData);
        await order.save();
        res.json(order);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update order
router.put('/:id', async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Status o'zgarishlarida vaqtlarni avtomatik saqlash
        if (updateData.status === 'ACCEPTED' && !updateData.acceptedAt) {
            updateData.acceptedAt = new Date();
        }
        if (updateData.status === 'IN_PROGRESS' && !updateData.startedAt) {
            updateData.startedAt = new Date();
        }
        if (updateData.status === 'COMPLETED' && !updateData.completedAt) {
            updateData.completedAt = new Date();
        }

        const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (order) res.json(order);
        else res.status(404).json({ message: 'Order not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (order) {
            res.json({ success: true, message: 'Order deleted' });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fix invalid prices - noto'g'ri narxlarni to'g'irlash
router.post('/fix-prices', async (req, res) => {
    try {
        // 1. Juda katta narxlarni to'g'irlash (100 million dan katta)
        const bigPrices = await Order.updateMany(
            { price: { $gt: 100000000 } },
            { $set: { price: 100000 } }
        );

        // 2. Barcha buyurtmalarni olib, decimal narxlarni integer qilish
        const orders = await Order.find({});
        let fixedCount = 0;

        for (const order of orders) {
            const originalPrice = order.price;
            const fixedPrice = Math.round(originalPrice);

            if (originalPrice !== fixedPrice) {
                await Order.findByIdAndUpdate(order._id, { price: fixedPrice });
                fixedCount++;
            }
        }

        res.json({
            success: true,
            message: `${bigPrices.modifiedCount} ta katta, ${fixedCount} ta decimal to'g'rilandi`,
            bigPricesFixed: bigPrices.modifiedCount,
            decimalPricesFixed: fixedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
