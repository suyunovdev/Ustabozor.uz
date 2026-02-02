const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const cache = require('../utils/cache');
const { cacheMiddleware, clearCacheMiddleware } = cache;

// Cache configuration
const ORDER_CACHE_TTL = 30000; // 30 seconds
const ORDER_NAMESPACE = 'orders';

// ==================== CACHE HELPERS ====================

/**
 * Generate cache key for orders
 */
const generateOrderCacheKey = (query = {}) => {
    const sortedQuery = Object.keys(query)
        .sort()
        .reduce((acc, key) => {
            acc[key] = query[key];
            return acc;
        }, {});
    return `orders:list:${JSON.stringify(sortedQuery)}`;
};

/**
 * Invalidate all order-related cache
 */
const invalidateOrderCache = () => {
    cache.deleteNamespace(ORDER_NAMESPACE);
    cache.deleteByTag('orders');
    console.log('📦 Order cache invalidated');
};

// ==================== ROUTES ====================

// Get all orders with advanced caching
router.get('/', async (req, res) => {
    try {
        const cacheKey = generateOrderCacheKey(req.query);

        // Try to get from cache
        const cachedOrders = cache.get(cacheKey);
        if (cachedOrders) {
            console.log('📦 Orders served from cache');
            return res.json(cachedOrders);
        }

        // Fetch from database
        let query = Order.find();

        // Apply filters if provided
        if (req.query.status) {
            query = query.where('status').equals(req.query.status);
        }
        if (req.query.customerId) {
            query = query.where('customerId').equals(req.query.customerId);
        }
        if (req.query.workerId) {
            query = query.where('workerId').equals(req.query.workerId);
        }
        if (req.query.category) {
            query = query.where('category').equals(req.query.category);
        }

        // Apply sorting
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        query = query.sort({ [sortBy]: sortOrder });

        // Apply pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        if (req.query.limit) {
            query = query.skip(skip).limit(limit);
        }

        const orders = await query.populate('customerId workerId', 'name surname avatar phone rating');

        // Get total count for pagination
        const totalCount = await Order.countDocuments(query.getFilter());

        const result = {
            orders,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        };

        // Cache the result
        cache.set(cacheKey, orders, {
            ttl: ORDER_CACHE_TTL,
            namespace: ORDER_NAMESPACE,
            tags: ['orders', 'orders-list']
        });

        console.log(`📦 Orders fetched from DB and cached (${orders.length} items)`);
        res.json(orders);
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single order by ID with caching
router.get('/:id', async (req, res) => {
    try {
        const cacheKey = `order:${req.params.id}`;

        // Try cache first
        const cachedOrder = cache.get(cacheKey);
        if (cachedOrder) {
            console.log(`📦 Order ${req.params.id} served from cache`);
            return res.json(cachedOrder);
        }

        const order = await Order.findById(req.params.id)
            .populate('customerId workerId', 'name surname avatar phone rating');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Cache for 1 minute
        cache.set(cacheKey, order, {
            ttl: 60000,
            namespace: ORDER_NAMESPACE,
            tags: ['orders', `order-${req.params.id}`]
        });

        res.json(order);
    } catch (error) {
        console.error('❌ Error fetching order:', error);
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

        // Populate for response
        await order.populate('customerId workerId', 'name surname avatar phone');

        // Invalidate cache
        invalidateOrderCache();

        console.log(`✅ New order created: ${order._id}`);
        res.json(order);
    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update order with smart cache invalidation
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
        if (updateData.status === 'CANCELLED' && !updateData.cancelledAt) {
            updateData.cancelledAt = new Date();
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('customerId workerId', 'name surname avatar phone');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Invalidate both specific order and list cache
        cache.delete(`order:${req.params.id}`);
        invalidateOrderCache();

        console.log(`✅ Order updated: ${order._id} - Status: ${order.status}`);
        res.json(order);
    } catch (error) {
        console.error('❌ Error updating order:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Invalidate cache
        cache.delete(`order:${req.params.id}`);
        invalidateOrderCache();

        console.log(`🗑️ Order deleted: ${req.params.id}`);
        res.json({ success: true, message: 'Order deleted' });
    } catch (error) {
        console.error('❌ Error deleting order:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== STATISTICS ENDPOINTS ====================

// Get order statistics with caching
router.get('/stats/overview', async (req, res) => {
    try {
        const cacheKey = 'orders:stats:overview';

        const cachedStats = cache.get(cacheKey);
        if (cachedStats) {
            return res.json(cachedStats);
        }

        // Aggregate statistics
        const [statusStats, categoryStats, revenueStats, dailyStats] = await Promise.all([
            // Status distribution
            Order.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            // Category distribution
            Order.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 }, totalRevenue: { $sum: '$price' } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            // Revenue stats
            Order.aggregate([
                { $match: { status: 'COMPLETED' } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$price' },
                        avgOrderValue: { $avg: '$price' },
                        orderCount: { $sum: 1 }
                    }
                }
            ]),
            // Daily orders (last 30 days)
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                        revenue: { $sum: '$price' }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        const stats = {
            statusDistribution: statusStats.reduce((acc, s) => {
                acc[s._id] = s.count;
                return acc;
            }, {}),
            categoryDistribution: categoryStats,
            revenue: revenueStats[0] || { totalRevenue: 0, avgOrderValue: 0, orderCount: 0 },
            dailyTrends: dailyStats,
            generatedAt: new Date()
        };

        // Cache for 5 minutes
        cache.set(cacheKey, stats, {
            ttl: 300000,
            namespace: ORDER_NAMESPACE,
            tags: ['orders', 'stats']
        });

        res.json(stats);
    } catch (error) {
        console.error('❌ Error getting order stats:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get orders by worker with optimized query
router.get('/worker/:workerId', async (req, res) => {
    try {
        const cacheKey = `orders:worker:${req.params.workerId}`;

        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const orders = await Order.find({ workerId: req.params.workerId })
            .populate('customerId', 'name surname avatar phone')
            .sort({ createdAt: -1 });

        cache.set(cacheKey, orders, {
            ttl: ORDER_CACHE_TTL,
            namespace: ORDER_NAMESPACE,
            tags: ['orders', `worker-${req.params.workerId}`]
        });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get orders by customer with optimized query
router.get('/customer/:customerId', async (req, res) => {
    try {
        const cacheKey = `orders:customer:${req.params.customerId}`;

        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const orders = await Order.find({ customerId: req.params.customerId })
            .populate('workerId', 'name surname avatar phone rating')
            .sort({ createdAt: -1 });

        cache.set(cacheKey, orders, {
            ttl: ORDER_CACHE_TTL,
            namespace: ORDER_NAMESPACE,
            tags: ['orders', `customer-${req.params.customerId}`]
        });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==================== ADMIN ENDPOINTS ====================

// Fix invalid prices
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

        // Invalidate cache after fixing
        invalidateOrderCache();

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

// Get cache statistics
router.get('/admin/cache-stats', async (req, res) => {
    try {
        const stats = cache.getStats();
        res.json({
            success: true,
            cache: stats,
            orderCacheKeys: cache.getNamespaceKeys(ORDER_NAMESPACE)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Clear order cache manually
router.post('/admin/clear-cache', async (req, res) => {
    try {
        invalidateOrderCache();
        res.json({ success: true, message: 'Order cache cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
