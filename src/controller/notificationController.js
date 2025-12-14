const deviceService = require('../service/deviceService');
const notificationService = require('../service/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');

/**
 * Notification Controller
 */
class NotificationController {
    /**
     * Lấy notification theo device
     * GET /api/notifications/:deviceId?limit=50
     */
    async getNotifications(req, res) {
        try {
            const { deviceId } = req.params;
            const limit = parseInt(req.query.limit) || 50;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const notifications = await notificationService.getNotifications(device._id, limit);
            return successResponse(res, notifications, MESSAGES.DATA_RETRIEVED);
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

module.exports = new NotificationController();
