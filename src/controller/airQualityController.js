const deviceService = require('../service/deviceService');
const airQualityService = require('../service/airQualityService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');


class AirQualityController {
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
}

module.exports = new AirQualityController();
