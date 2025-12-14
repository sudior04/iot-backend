const express = require('express');
const router = express.Router();
const mqttController = require('../controller/mqttController');
const { validateThreshold } = require('../middlewares/validateRequest');

/**
 * MQTT Routes
 */

// Lấy trạng thái MQTT connection
router.get('/status', (req, res) => mqttController.getStatus(req, res));

// Gửi yêu cầu lấy dữ liệu từ device
router.post('/get-data', (req, res) => mqttController.sendGetData(req, res));

// Legacy endpoint (backward compatibility)
router.post('/getData', (req, res) => mqttController.sendGetData(req, res));

// Thay đổi threshold
router.post('/change-threshold', validateThreshold, (req, res) => mqttController.sendChangeThreshold(req, res));

// Legacy endpoint (backward compatibility)
router.post('/changeThreshold', validateThreshold, (req, res) => mqttController.sendChangeThreshold(req, res));

// Gửi command tùy chỉnh
router.post('/send-command', (req, res) => mqttController.sendCustomCommand(req, res));

// Publish message tùy chỉnh
router.post('/publish', (req, res) => mqttController.publishMessage(req, res));

module.exports = router;
