const express = require('express');
const router = express.Router();
const deviceController = require('../controller/deviceController');

/**
 * Device Routes
 */

// Lấy tất cả devices
router.get('/', (req, res) => deviceController.getAllDevices(req, res));

// Lấy hoặc tạo device
router.get('/:deviceId', (req, res) => deviceController.getOrCreateDevice(req, res));

// Lấy device theo ID (exact match)
router.get('/by-id/:deviceId', (req, res) => deviceController.getDeviceById(req, res));

// Lấy trạng thái và uptime của device
router.get('/:deviceId/status', (req, res) => deviceController.getDeviceStatus(req, res));

// Cập nhật trạng thái device
router.put('/:deviceId/status', (req, res) => deviceController.updateStatus(req, res));

// Cập nhật thresholds
router.put('/:deviceId/thresholds', (req, res) => deviceController.updateThresholds(req, res));

// Cập nhật metadata
router.put('/:deviceId/metadata', (req, res) => deviceController.updateMetadata(req, res));

// Cập nhật uptime khi device offline
router.post('/:deviceId/update-uptime', (req, res) => deviceController.updateUptime(req, res));

module.exports = router;
