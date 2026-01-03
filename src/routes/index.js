const express = require('express');
const router = express.Router();

const dataRoutes = require('./dataRoutes');
const notificationRoutes = require('./notificationRoutes');
const mqttRoutes = require('./mqttRoutes');
const userRoutes = require('./userRoutes');
const deviceRoutes = require('./deviceRoutes');

router.get('/', (req, res) => {
    res.json({
        message: 'IoT Air Quality Monitoring Server',
        status: 'running',
        version: '1.0.0'
    });
});

router.use('/data', dataRoutes);
router.use('/notifications', notificationRoutes);
router.use('/mqtt', mqttRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);

module.exports = router;
