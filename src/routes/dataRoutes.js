const express = require('express');
const router = express.Router();
const airQualityController = require('../controller/airQualityController');

router.get('/latest/:deviceId', (req, res) => airQualityController.getLatestData(req, res));

router.get('/history/:deviceId', (req, res) => airQualityController.getHistory(req, res));

router.get('/time-range/:deviceId', (req, res) => airQualityController.getDataByTimeRange(req, res));

router.get('/statistics/:deviceId', (req, res) => airQualityController.getStatistics(req, res));

router.get('/grouped/:deviceId', (req, res) => airQualityController.getGroupedData(req, res));

module.exports = router;
