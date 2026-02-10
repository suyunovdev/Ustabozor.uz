const express = require('express');
const router = express.Router();
const { ordersRef } = require('../models/Order');
const { docToObj, queryToArray, withTimestamps, withUpdatedAt, populateUsers, FieldValue } = require('../models/firestore');
const { getDb } = require('../config/db');
const cache = require('../utils/cache');

const ORDER_CACHE_TTL = 30000;
const ORDER_NAMESPACE = 'orders';

const generateOrderCacheKey = (query = {}) => {
    const sortedQuery = Object.keys(query).sort().reduce((acc, key) => {
        acc[key] = query[key];
        return acc;
    }, {});
    return `orders:list:${JSON.stringify(sortedQuery)}`;
};

const invalidateOrderCache = () => {
    cache.deleteNamespace(ORDER_NAMESPACE);
    cache.deleteByTag('orders');
};

// Helper to populate order with user details
const populateOrder = async (order) => {
    const userIds = [order.customerId, order.workerId].filter(Boolean);
    const usersMap = await populateUsers(userIds, ['name', 'surname', 'avatar', 'phone', 'rating']);
    return {
        ...order,
        customerId: usersMap[order.customerId] || order.customerId,
        workerId: order.workerId ? (usersMap[order.workerId] || order.workerId) : null
    };
};

const populateOrders = async (orders) => {
    const userIds = [];
    orders.forEach(o => {
        if (o.customerId) userIds.push(o.customerId);
        if (o.workerId) userIds.push(o.workerId);
    });
    const usersMap = await populateUsers(userIds, ['name', 'surname', 'avatar', 'phone', 'rating']);
    return orders.map(order => ({
        ...order,
        customerId: usersMap[order.customerId] || order.customerId,
        workerId: order.workerId ? (usersMap[order.workerId] || order.workerId) : null
    }));
};

// Get all orders
router.get('/', async (req, res) => {
    try {
        const cacheKey = generateOrderCacheKey(req.query);
        const cachedOrders = cache.get(cacheKey);
        if (cachedOrders) return res.json(cachedOrders);

        let query = ordersRef();

        if (req.query.status) query = query.where('status', '==', req.query.status);
        if (req.query.customerId) query = query.where('customerId', '==', req.query.customerId);
        if (req.query.workerId) query = query.where('workerId', '==', req.query.workerId);
        if (req.query.category) query = query.where('category', '==', req.query.category);

        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        query = query.orderBy(sortBy, sortOrder);

        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        if (req.query.limit) {
            query = query.offset(offset).limit(limit);
        }

        const snapshot = await query.get();
        let orders = queryToArray(snapshot);
        orders = await populateOrders(orders);

        cache.set(cacheKey, orders, { ttl: ORDER_CACHE_TTL, namespace: ORDER_NAMESPACE, tags: ['orders', 'orders-list'] });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: error.message });
    }
});

// IMPORTANT: stats/overview must be before /:id
router.get('/stats/overview', async (req, res) => {
    try {
        const cacheKey = 'orders:stats:overview';
        const cachedStats = cache.get(cacheKey);
        if (cachedStats) return res.json(cachedStats);

        const allSnapshot = await ordersRef().get();
        const allOrders = queryToArray(allSnapshot);

        // Status distribution
        const statusDistribution = {};
        allOrders.forEach(o => {
            statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1;
        });

        // Category distribution (top 10)
        const categoryMap = {};
        allOrders.forEach(o => {
            if (!categoryMap[o.category]) categoryMap[o.category] = { count: 0, totalRevenue: 0 };
            categoryMap[o.category].count++;
            categoryMap[o.category].totalRevenue += o.price || 0;
        });
        const categoryDistribution = Object.entries(categoryMap)
            .map(([_id, data]) => ({ _id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Revenue stats (completed only)
        const completed = allOrders.filter(o => o.status === 'COMPLETED');
        const totalRevenue = completed.reduce((sum, o) => sum + (o.price || 0), 0);
        const avgOrderValue = completed.length ? totalRevenue / completed.length : 0;

        // Daily trends (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dailyMap = {};
        allOrders.forEach(o => {
            const date = o.createdAt ? new Date(o.createdAt) : null;
            if (date && date >= thirtyDaysAgo) {
                const key = date.toISOString().split('T')[0];
                if (!dailyMap[key]) dailyMap[key] = { count: 0, revenue: 0 };
                dailyMap[key].count++;
                dailyMap[key].revenue += o.price || 0;
            }
        });
        const dailyTrends = Object.entries(dailyMap)
            .map(([_id, data]) => ({ _id, ...data }))
            .sort((a, b) => a._id.localeCompare(b._id));

        const stats = {
            statusDistribution,
            categoryDistribution,
            revenue: { totalRevenue, avgOrderValue, orderCount: completed.length },
            dailyTrends,
            generatedAt: new Date()
        };

        cache.set(cacheKey, stats, { ttl: 300000, namespace: ORDER_NAMESPACE, tags: ['orders', 'stats'] });
        res.json(stats);
    } catch (error) {
        console.error('Error getting order stats:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get orders by worker
router.get('/worker/:workerId', async (req, res) => {
    try {
        const cacheKey = `orders:worker:${req.params.workerId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const snapshot = await ordersRef()
            .where('workerId', '==', req.params.workerId)
            .orderBy('createdAt', 'desc')
            .get();

        let orders = queryToArray(snapshot);
        orders = await populateOrders(orders);

        cache.set(cacheKey, orders, { ttl: ORDER_CACHE_TTL, namespace: ORDER_NAMESPACE, tags: ['orders'] });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get orders by customer
router.get('/customer/:customerId', async (req, res) => {
    try {
        const cacheKey = `orders:customer:${req.params.customerId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const snapshot = await ordersRef()
            .where('customerId', '==', req.params.customerId)
            .orderBy('createdAt', 'desc')
            .get();

        let orders = queryToArray(snapshot);
        orders = await populateOrders(orders);

        cache.set(cacheKey, orders, { ttl: ORDER_CACHE_TTL, namespace: ORDER_NAMESPACE, tags: ['orders'] });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin cache stats
router.get('/admin/cache-stats', async (req, res) => {
    try {
        const stats = cache.getStats();
        res.json({ success: true, cache: stats, orderCacheKeys: cache.getNamespaceKeys(ORDER_NAMESPACE) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single order by ID
router.get('/:id', async (req, res) => {
    try {
        const cacheKey = `order:${req.params.id}`;
        const cachedOrder = cache.get(cacheKey);
        if (cachedOrder) return res.json(cachedOrder);

        const doc = await ordersRef().doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Order not found' });
        }

        let order = docToObj(doc);
        order = await populateOrder(order);

        cache.set(cacheKey, order, { ttl: 60000, namespace: ORDER_NAMESPACE, tags: ['orders'] });
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create order
router.post('/', async (req, res) => {
    try {
        const orderData = { ...req.body };

        if (orderData.workerId) {
            orderData.status = 'ACCEPTED';
            orderData.acceptedAt = new Date().toISOString();
        } else {
            orderData.status = orderData.status || 'PENDING';
        }

        orderData.aiSuggested = orderData.aiSuggested || false;
        orderData.price = Number(orderData.price) || 0;

        const docRef = await ordersRef().add(withTimestamps(orderData));
        const newDoc = await docRef.get();
        let order = docToObj(newDoc);
        order = await populateOrder(order);

        invalidateOrderCache();
        console.log(`New order created: ${order._id}`);
        res.json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update order
router.put('/:id', async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (updateData.status === 'ACCEPTED' && !updateData.acceptedAt) updateData.acceptedAt = new Date().toISOString();
        if (updateData.status === 'IN_PROGRESS' && !updateData.startedAt) updateData.startedAt = new Date().toISOString();
        if (updateData.status === 'COMPLETED' && !updateData.completedAt) updateData.completedAt = new Date().toISOString();
        if (updateData.status === 'CANCELLED' && !updateData.cancelledAt) updateData.cancelledAt = new Date().toISOString();

        const docRef = ordersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Order not found' });
        }

        await docRef.update(withUpdatedAt(updateData));
        const updated = await docRef.get();
        let order = docToObj(updated);
        order = await populateOrder(order);

        cache.delete(`order:${req.params.id}`);
        invalidateOrderCache();
        res.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const docRef = ordersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Order not found' });
        }

        await docRef.delete();
        cache.delete(`order:${req.params.id}`);
        invalidateOrderCache();
        res.json({ success: true, message: 'Order deleted' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: error.message });
    }
});

// Fix invalid prices
router.post('/fix-prices', async (req, res) => {
    try {
        const allSnapshot = await ordersRef().get();
        let bigFixed = 0;
        let decimalFixed = 0;

        const batch = getDb().batch();
        allSnapshot.docs.forEach(doc => {
            const price = doc.data().price;
            if (price > 100000000) {
                batch.update(doc.ref, { price: 100000 });
                bigFixed++;
            } else if (price !== Math.round(price)) {
                batch.update(doc.ref, { price: Math.round(price) });
                decimalFixed++;
            }
        });

        await batch.commit();
        invalidateOrderCache();

        res.json({
            success: true,
            message: `${bigFixed} ta katta, ${decimalFixed} ta decimal to'g'rilandi`,
            bigPricesFixed: bigFixed,
            decimalPricesFixed: decimalFixed
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Clear order cache
router.post('/admin/clear-cache', async (req, res) => {
    try {
        invalidateOrderCache();
        res.json({ success: true, message: 'Order cache cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
