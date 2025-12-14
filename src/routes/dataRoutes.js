const express = require('express');
const router = express.Router();
const airQualityController = require('../controller/airQualityController');

/**
 * Air Quality Data Routes
 */

// GET /api/data/latest/:deviceId - Lấy dữ liệu mới nhất
router.get('/latest/:deviceId', (req, res) => airQualityController.getLatestData(req, res));

// GET /api/data/history/:deviceId - Lấy lịch sử dữ liệu
router.get('/history/:deviceId', (req, res) => airQualityController.getHistory(req, res));

module.exports = router;
