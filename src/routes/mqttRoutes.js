const express = require('express');
const router = express.Router();
const mqttController = require('../controller/mqttController');
const { validateThreshold } = require('../middlewares/validateRequest');

// Lấy trạng thái MQTT connection
router.get('/status', (req, res) => mqttController.getStatus(req, res));

// Gửi yêu cầu lấy dữ liệu từ device
router.post('/getData', (req, res) => mqttController.requestData(req, res));

// Thay đổi threshold
router.post('/change-threshold', validateThreshold, (req, res) => mqttController.sendChangeThreshold(req, res));


// Gửi lệnh tắt còi cảnh báo
router.post('/alarm-off', (req, res) => mqttController.sendAlarmOff(req, res));

// Gửi lệnh thay đổi tốc độ publish
router.post('/change-rate', (req, res) => mqttController.sendChangeRate(req, res));

// Gửi command tùy chỉnh
router.post('/send-command', (req, res) => mqttController.sendCustomCommand(req, res));

// Publish message tùy chỉnh
router.post('/publish', (req, res) => mqttController.publishMessage(req, res));

module.exports = router;
