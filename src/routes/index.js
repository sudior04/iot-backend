const express = require('express');
const router = express.Router();

// Import route modules
const dataRoutes = require('./dataRoutes');
const notificationRoutes = require('./notificationRoutes');
const mqttRoutes = require('./mqttRoutes');
const userRoutes = require('./userRoutes');

/**
 * Main Router - Tổng hợp tất cả routes
 */

// Health check
router.get('/', (req, res) => {
    res.json({
        message: 'IoT Air Quality Monitoring Server',
        status: 'running',
        version: '1.0.0'
    });
});

// Mount routes
router.use('/data', dataRoutes);
router.use('/notifications', notificationRoutes);
router.use('/mqtt', mqttRoutes);
router.use('/users', userRoutes);

module.exports = router;
