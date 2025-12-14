const deviceService = require('../service/deviceService');
const airQualityService = require('../service/airQualityService');
const notificationService = require('../service/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');

/**
 * Air Quality Data Controller
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
            return errorResponse(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
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
            return errorResponse(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

module.exports = new AirQualityController();
