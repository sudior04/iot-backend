const mqttService = require('../service/mqttService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');

class MQTTController {

    async getStatus(req, res) {
        try {
            const status = mqttService.getStatus();
            return successResponse(res, status, 'Lấy trạng thái MQTT thành công');
        } catch (error) {
            logger.error('Error in getStatus:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async requestData(req, res) {
        try {
            const { deviceId } = req.body;
            const result = await mqttService.requestData(deviceId);
            return successResponse(
                res,
                result,
                'Yêu cầu lấy dữ liệu đã được gửi'
            );
        } catch (error) {
            logger.error('Error in requestData:', error);
            return errorResponse(
                res,
                error.message,
                error.message.includes('chưa sẵn sàng')
                    ? HTTP_STATUS.SERVICE_UNAVAILABLE
                    : HTTP_STATUS.INTERNAL_SERVER_ERROR
            );
        }
    }

    async sendAlarmOff(req, res) {
        try {
            const { deviceId } = req.body;
            const result = await mqttService.sendAlarmOff(deviceId);

            return successResponse(
                res,
                result,
                'Lệnh tắt còi cảnh báo đã được gửi'
            );
        } catch (error) {
            logger.error('Error in sendAlarmOff:', error);
            return errorResponse(
                res,
                error.message,
                error.message.includes('chưa sẵn sàng')
                    ? HTTP_STATUS.SERVICE_UNAVAILABLE
                    : HTTP_STATUS.INTERNAL_SERVER_ERROR
            );
        }
    }

    async sendChangeRate(req, res) {
        try {
            const { rate, deviceId } = req.body;

            if (!rate) {
                return errorResponse(
                    res,
                    'Vui lòng cung cấp tốc độ publish (rate)',
                    HTTP_STATUS.BAD_REQUEST
                );
            }

            const result = await mqttService.changePublishRate(rate, deviceId);

            return successResponse(
                res,
                result,
                `Tốc độ publish đã được đổi thành ${rate} giây`
            );
        } catch (error) {
            logger.error('Error in sendChangeRate:', error);

            if (error.message.includes('phải từ')) {
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

    async sendChangeThreshold(req, res) {
        try {
            const { MQ2Threshold, MQ135Threshold, HumThreshold, TempThreshold, DustThreshold, deviceId } = req.body;

            // Validate required fields
            if (!MQ2Threshold && !MQ135Threshold && !HumThreshold && !TempThreshold && !DustThreshold) {
                return errorResponse(
                    res,
                    'Vui lòng cung cấp ít nhất một threshold',
                    HTTP_STATUS.BAD_REQUEST
                );
            }

            const thresholdData = {
                MQ2Threshold,
                MQ135Threshold,
                DustThreshold,
                HumThreshold,
                TempThreshold
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
