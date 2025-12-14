const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');

/**
 * Notification Routes
 */

// GET /api/notifications/:deviceId - Lấy notifications theo device
router.get('/:deviceId', (req, res) => notificationController.getNotifications(req, res));

module.exports = router;
