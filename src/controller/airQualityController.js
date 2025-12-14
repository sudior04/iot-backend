const deviceService = require('../service/deviceService');
const airQualityService = require('../service/airQualityService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');

/**
 * Air Quality Data Controller - Xử lý HTTP requests liên quan đến dữ liệu chất lượng không khí
 */
class AirQualityController {
    /**
     * Lấy dữ liệu mới nhất theo device
     * GET /api/data/latest/:deviceId
     */
    async getLatestData(req, res) {
        try {
            const { deviceId } = req.params;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const latest = await airQualityService.getLatestData(device._id);
            return successResponse(res, latest, MESSAGES.DATA_RETRIEVED);
        } catch (error) {
            logger.error('Error in getLatestData:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Lấy lịch sử dữ liệu
     * GET /api/data/history/:deviceId?limit=50
     */
    async getHistory(req, res) {
        try {
            const { deviceId } = req.params;
            const limit = parseInt(req.query.limit) || 50;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const history = await airQualityService.getHistory(device._id, limit);
            return successResponse(res, history, MESSAGES.DATA_RETRIEVED);
        } catch (error) {
            logger.error('Error in getHistory:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Lấy dữ liệu trong khoảng thời gian
     * GET /api/data/time-range/:deviceId?startDate=2024-01-01&endDate=2024-12-31&limit=1000
     */
    async getDataByTimeRange(req, res) {
        try {
            const { deviceId } = req.params;
            const { startDate, endDate } = req.query;
            const limit = parseInt(req.query.limit) || 1000;

            if (!startDate || !endDate) {
                return errorResponse(res, 'startDate và endDate là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const data = await airQualityService.getDataByTimeRange(device._id, startDate, endDate, limit);
            return successResponse(res, {
                deviceId,
                startDate,
                endDate,
                count: data.length,
                data
            }, 'Lấy dữ liệu theo khoảng thời gian thành công');
        } catch (error) {
            logger.error('Error in getDataByTimeRange:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Lấy thống kê dữ liệu trong khoảng thời gian
     * GET /api/data/statistics/:deviceId?startDate=2024-01-01&endDate=2024-12-31
     */
    async getStatistics(req, res) {
        try {
            const { deviceId } = req.params;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return errorResponse(res, 'startDate và endDate là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const stats = await airQualityService.getStatistics(device._id, startDate, endDate);
            return successResponse(res, {
                deviceId,
                startDate,
                endDate,
                statistics: stats
            }, 'Lấy thống kê thành công');
        } catch (error) {
            logger.error('Error in getStatistics:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gợi ý ngưỡng tự động dựa trên dữ liệu lịch sử
     * GET /api/data/suggest-thresholds/:deviceId?days=7
     */
    async suggestThresholds(req, res) {
        try {
            const { deviceId } = req.params;
            const days = parseInt(req.query.days) || 7;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const suggestions = await airQualityService.suggestThresholds(device._id, days);
            return successResponse(res, {
                deviceId,
                suggestions
            }, 'Gợi ý ngưỡng thành công');
        } catch (error) {
            logger.error('Error in suggestThresholds:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Lấy dữ liệu nhóm theo thời gian (hourly, daily, weekly)
     * GET /api/data/grouped/:deviceId?groupBy=hour&startDate=2024-01-01&endDate=2024-12-31
     */
    async getGroupedData(req, res) {
        try {
            const { deviceId } = req.params;
            const { groupBy, startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return errorResponse(res, 'startDate và endDate là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            if (groupBy && !['hour', 'day', 'week'].includes(groupBy)) {
                return errorResponse(res, 'groupBy phải là: hour, day hoặc week', HTTP_STATUS.BAD_REQUEST);
            }

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const data = await airQualityService.getGroupedData(device._id, groupBy || 'hour', startDate, endDate);
            return successResponse(res, {
                deviceId,
                groupBy: groupBy || 'hour',
                startDate,
                endDate,
                data
            }, 'Lấy dữ liệu nhóm thành công');
        } catch (error) {
            logger.error('Error in getGroupedData:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Tạo bản ghi dữ liệu mới (thường dùng cho testing)
     * POST /api/data/:deviceId
     * Body: { pm25, mq135, mq2, temp, humidity, ... }
     */
    async createRecord(req, res) {
        try {
            const { deviceId } = req.params;
            const data = req.body;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const record = await airQualityService.createRecord(device._id, data);
            return successResponse(res, record, 'Tạo bản ghi dữ liệu thành công', HTTP_STATUS.CREATED);
        } catch (error) {
            logger.error('Error in createRecord:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

module.exports = new AirQualityController();
