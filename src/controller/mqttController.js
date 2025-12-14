const mqttService = require('../service/mqttService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');

/**
 * MQTT Controller - Xử lý HTTP requests liên quan đến MQTT
 */
class MQTTController {
    /**
     * Lấy trạng thái MQTT connection
     * GET /api/mqtt/status
     */
    async getStatus(req, res) {
        try {
            const status = mqttService.getStatus();
            return successResponse(res, status, 'Lấy trạng thái MQTT thành công');
        } catch (error) {
            logger.error('Error in getStatus:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gửi yêu cầu lấy dữ liệu từ device
     * POST /api/mqtt/get-data
     * Body: { deviceId?: string }
     */
    async sendGetData(req, res) {
        try {
            const { deviceId } = req.body;
            const result = await mqttService.requestData(deviceId);

            return successResponse(
                res,
                result,
                MESSAGES.MQTT_GET_DATA_SENT || 'Yêu cầu lấy dữ liệu đã được gửi'
            );
        } catch (error) {
            logger.error('Error in sendGetData:', error);
            return errorResponse(
                res,
                error.message,
                error.message.includes('chưa sẵn sàng')
                    ? HTTP_STATUS.SERVICE_UNAVAILABLE
                    : HTTP_STATUS.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Gửi lệnh thay đổi threshold
     * POST /api/mqtt/change-threshold
     * Body: { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP, deviceId? }
     */
    async sendChangeThreshold(req, res) {
        try {
            const { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP, deviceId } = req.body;

            // Validate required fields
            if (!THRESHOLD34 && !THRESHOLD35 && !THRESHOLD_HUMD && !THRESHOLD_TEMP) {
                return errorResponse(
                    res,
                    'Vui lòng cung cấp ít nhất một threshold',
                    HTTP_STATUS.BAD_REQUEST
                );
            }

            const thresholdData = {
                THRESHOLD34,
                THRESHOLD35,
                THRESHOLD_HUMD,
                THRESHOLD_TEMP
            };

            const result = await mqttService.changeThreshold(thresholdData, deviceId);

            return successResponse(
                res,
                result,
                MESSAGES.MQTT_THRESHOLD_SENT || 'Threshold đã được cập nhật'
            );
        } catch (error) {
            logger.error('Error in sendChangeThreshold:', error);

            // Xử lý validation errors
            if (error.message.includes('không hợp lệ') || error.message.includes('phải từ')) {
                return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
            }

            return errorResponse(
                res,
                error.message,
                error.message.includes('chưa sẵn sàng')
                    ? HTTP_STATUS.SERVICE_UNAVAILABLE
                    : HTTP_STATUS.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Gửi command tùy chỉnh đến device
     * POST /api/mqtt/send-command
     * Body: { deviceId, command, params? }
     */
    async sendCustomCommand(req, res) {
        try {
            const { deviceId, command, params } = req.body;

            if (!deviceId || !command) {
                return errorResponse(
                    res,
                    'deviceId và command là bắt buộc',
                    HTTP_STATUS.BAD_REQUEST
                );
            }

            const result = await mqttService.sendCustomCommand(deviceId, command, params);

            return successResponse(
                res,
                result,
                'Command đã được gửi'
            );
        } catch (error) {
            logger.error('Error in sendCustomCommand:', error);
            return errorResponse(
                res,
                error.message,
                error.message.includes('chưa sẵn sàng')
                    ? HTTP_STATUS.SERVICE_UNAVAILABLE
                    : HTTP_STATUS.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Publish message tùy chỉnh
     * POST /api/mqtt/publish
     * Body: { topic, payload }
     */
    async publishMessage(req, res) {
        try {
            const { topic, payload } = req.body;

            if (!topic || !payload) {
                return errorResponse(
                    res,
                    'topic và payload là bắt buộc',
                    HTTP_STATUS.BAD_REQUEST
                );
            }

            const result = await mqttService.publishMessage(topic, payload);

            return successResponse(
                res,
                result,
                'Message đã được publish'
            );
        } catch (error) {
            logger.error('Error in publishMessage:', error);
            return errorResponse(
                res,
                error.message,
                error.message.includes('chưa sẵn sàng')
                    ? HTTP_STATUS.SERVICE_UNAVAILABLE
                    : HTTP_STATUS.INTERNAL_SERVER_ERROR
            );
        }
    }
}

module.exports = new MQTTController();
