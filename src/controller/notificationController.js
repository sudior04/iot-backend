const deviceService = require('../service/deviceService');
const notificationService = require('../service/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');


class NotificationController {
    async getNotifications(req, res) {
        try {
            const { deviceId } = req.params;
            const limit = parseInt(req.query.limit) || 50;

            const filters = {
                severity: req.query.severity,
                isRead: req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined,
                type: req.query.type,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const notifications = await notificationService.getNotifications(device._id, limit, filters);
            return successResponse(res, {
                deviceId,
                count: notifications.length,
                notifications
            }, MESSAGES.DATA_RETRIEVED);
        } catch (error) {
            logger.error('Error in getNotifications:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async createNotification(req, res) {
        try {
            const { deviceId } = req.params;
            const { eventType, message, severity } = req.body;

            if (!eventType || !message) {
                return errorResponse(res, 'eventType và message là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            // Cần airQualityId - lấy bản ghi mới nhất
            const airQualityService = require('../service/airQualityService');
            const latestData = await airQualityService.getLatestData(device._id);

            if (!latestData) {
                return errorResponse(res, 'Không có dữ liệu air quality', HTTP_STATUS.BAD_REQUEST);
            }

            const notification = await notificationService.createNotification(
                device._id,
                latestData._id,
                eventType,
                message,
                severity || 'info'
            );

            return successResponse(res, notification, 'Tạo notification thành công', HTTP_STATUS.CREATED);
        } catch (error) {
            logger.error('Error in createNotification:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getSettings(req, res) {
        try {
            const { deviceId } = req.params;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const settings = await notificationService.getNotificationSettings(device._id);
            return successResponse(res, settings, 'Lấy cài đặt thông báo thành công');
        } catch (error) {
            logger.error('Error in getSettings:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async updateSettings(req, res) {
        try {
            const { deviceId } = req.params;
            const settingsData = req.body;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const settings = await notificationService.updateNotificationSettings(
                device._id,
                settingsData
            );

            return successResponse(res, settings, 'Cập nhật cài đặt thông báo thành công');
        } catch (error) {
            logger.error('Error in updateSettings:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async toggleNotifications(req, res) {
        try {
            const { deviceId } = req.params;
            const { enabled } = req.body;

            if (enabled === undefined) {
                return errorResponse(res, 'enabled là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const settings = await notificationService.toggleNotifications(device._id, enabled);

            return successResponse(res, settings, `Đã ${enabled ? 'bật' : 'tắt'} thông báo`);
        } catch (error) {
            logger.error('Error in toggleNotifications:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;

            const notification = await notificationService.markAsRead(notificationId);

            if (!notification) {
                return errorResponse(res, 'Notification không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, notification, 'Đã đánh dấu đã đọc');
        } catch (error) {
            logger.error('Error in markAsRead:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async markAllAsRead(req, res) {
        try {
            const { deviceId } = req.params;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const result = await notificationService.markAllAsRead(device._id);

            return successResponse(res, {
                modifiedCount: result.modifiedCount
            }, 'Đã đánh dấu tất cả đã đọc');
        } catch (error) {
            logger.error('Error in markAllAsRead:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;

            await notificationService.deleteNotification(notificationId);

            return successResponse(res, null, 'Xóa notification thành công');
        } catch (error) {
            logger.error('Error in deleteNotification:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteOldNotifications(req, res) {
        try {
            const { deviceId } = req.params;
            const days = parseInt(req.query.days) || 30;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const result = await notificationService.deleteOldNotifications(device._id, days);

            return successResponse(res, {
                deletedCount: result.deletedCount
            }, `Đã xóa notifications cũ hơn ${days} ngày`);
        } catch (error) {
            logger.error('Error in deleteOldNotifications:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getUnreadCount(req, res) {
        try {
            const { deviceId } = req.params;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const count = await notificationService.getUnreadCount(device._id);

            return successResponse(res, { unreadCount: count }, 'Lấy số lượng chưa đọc thành công');
        } catch (error) {
            logger.error('Error in getUnreadCount:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getStats(req, res) {
        try {
            const { deviceId } = req.params;
            const days = parseInt(req.query.days) || 7;

            const device = await deviceService.getDeviceById(deviceId);
            if (!device) {
                return errorResponse(res, MESSAGES.DEVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const stats = await notificationService.getNotificationStats(device._id, days);

            return successResponse(res, stats, 'Lấy thống kê notifications thành công');
        } catch (error) {
            logger.error('Error in getStats:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

module.exports = new NotificationController();
