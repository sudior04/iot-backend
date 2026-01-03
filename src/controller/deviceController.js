const deviceService = require('../service/deviceService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const logger = require('../utils/logger');

class DeviceController {
    async getOrCreateDevice(req, res) {
        try {
            const { deviceId } = req.params;

            const device = await deviceService.getOrCreateDevice(deviceId);

            return successResponse(res, device, 'Lấy device thành công');
        } catch (error) {
            logger.error('Error in getOrCreateDevice:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getDeviceById(req, res) {
        try {
            const { deviceId } = req.params;

            const device = await deviceService.getDeviceById(deviceId);

            if (!device) {
                return errorResponse(res, 'Device không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, device, 'Lấy device thành công');
        } catch (error) {
            logger.error('Error in getDeviceById:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getAllDevices(req, res) {
        try {
            const devices = await deviceService.getAllDevices();

            return successResponse(res, {
                count: devices.length,
                devices
            }, 'Lấy danh sách devices thành công');
        } catch (error) {
            logger.error('Error in getAllDevices:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async updateThresholds(req, res) {
        try {
            const { deviceId } = req.params;
            const thresholds = req.body;

            if (!thresholds.THRESHOLD_MQ2 && !thresholds.THRESHOLD_MQ135 && !thresholds.THRESHOLD_HUMD && !thresholds.THRESHOLD_TEMP && !thresholds.THRESHOLD_DUST) {
                return errorResponse(res, 'Vui lòng cung cấp ít nhất một threshold', HTTP_STATUS.BAD_REQUEST);
            }

            const device = await deviceService.updateThresholds(deviceId, thresholds);

            if (!device) {
                return errorResponse(res, 'Device không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, device, 'Cập nhật thresholds thành công');
        } catch (error) {
            logger.error('Error in updateThresholds:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async updateStatus(req, res) {
        try {
            const { deviceId } = req.params;
            const { status } = req.body;

            if (!status) {
                return errorResponse(res, 'status là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const validStatuses = ['online', 'offline', 'error', 'maintenance'];
            if (!validStatuses.includes(status)) {
                return errorResponse(res, `status phải là: ${validStatuses.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
            }

            const device = await deviceService.updateDeviceStatus(deviceId, status);

            if (!device) {
                return errorResponse(res, 'Device không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, device, 'Cập nhật trạng thái thành công');
        } catch (error) {
            logger.error('Error in updateStatus:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getDeviceStatus(req, res) {
        try {
            const { deviceId } = req.params;

            const status = await deviceService.getDeviceStatus(deviceId);

            return successResponse(res, status, 'Lấy trạng thái device thành công');
        } catch (error) {
            logger.error('Error in getDeviceStatus:', error);

            if (error.message === 'Device not found') {
                return errorResponse(res, 'Device không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async updateMetadata(req, res) {
        try {
            const { deviceId } = req.params;
            const metadata = req.body;

            if (!metadata.firmwareVersion && !metadata.location && !metadata.description) {
                return errorResponse(res, 'Vui lòng cung cấp ít nhất một thông tin metadata', HTTP_STATUS.BAD_REQUEST);
            }

            const device = await deviceService.updateDeviceMetadata(deviceId, metadata);

            if (!device) {
                return errorResponse(res, 'Device không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, device, 'Cập nhật metadata thành công');
        } catch (error) {
            logger.error('Error in updateMetadata:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Cập nhật uptime khi device offline (manual trigger)
     * POST /api/devices/:deviceId/update-uptime
     */
    async updateUptime(req, res) {
        try {
            const { deviceId } = req.params;

            const device = await deviceService.updateUptimeOnOffline(deviceId);

            if (!device) {
                return errorResponse(res, 'Device không tồn tại hoặc không có dữ liệu uptime', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, device, 'Cập nhật uptime thành công');
        } catch (error) {
            logger.error('Error in updateUptime:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

module.exports = new DeviceController();
