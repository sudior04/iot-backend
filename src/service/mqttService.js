const logger = require('../utils/logger');
const deviceService = require('./deviceService');
const airQualityService = require('./airQualityService');
const notificationService = require('./notificationService');
const config = require('../config/config');

/**
 * MQTT Service - Xử lý logic nghiệp vụ liên quan đến MQTT
 */
class MQTTService {
    constructor() {
        this.mqttClient = null;
    }

    /**
     * Set MQTT Client instance
     */
    setMQTTClient(client) {
        this.mqttClient = client;
    }

    /**
     * Kiểm tra MQTT client có sẵn sàng không
     */
    isReady() {
        return this.mqttClient && this.mqttClient.isConnected;
    }

    /**
     * Lấy trạng thái MQTT
     */
    getStatus() {
        if (!this.mqttClient) {
            return {
                connected: false,
                brokerUrl: config.mqtt.brokerUrl,
                error: 'MQTT client chưa được khởi tạo'
            };
        }
        return this.mqttClient.getStatus();
    }

    /**
     * Gửi yêu cầu lấy dữ liệu từ device
     */
    async requestData(deviceId = 'esp32') {
        try {
            if (!this.isReady()) {
                throw new Error('MQTT client chưa sẵn sàng');
            }

            // Cập nhật trạng thái device trước khi request
            await deviceService.updateDeviceStatus(deviceId, 'online');

            const payload = {
                deviceId,
                command: 'GET_DATA',
                timestamp: new Date().toISOString()
            };

            const result = this.mqttClient.publish(
                config.mqtt.topics.getData,
                JSON.stringify(payload)
            );

            logger.info(`Request data sent to device: ${deviceId}`);
            return {
                success: result,
                deviceId,
                timestamp: payload.timestamp
            };
        } catch (error) {
            logger.error('Error in requestData:', error);
            throw error;
        }
    }

    /**
     * Gửi lệnh thay đổi threshold
     */
    async changeThreshold(thresholdData, deviceId = 'esp32') {
        try {
            if (!this.isReady()) {
                throw new Error('MQTT client chưa sẵn sàng');
            }

            const { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP } = thresholdData;

            // Validate thresholds
            this.validateThresholds(thresholdData);

            // Cập nhật threshold trong database
            await deviceService.updateThresholds(deviceId, thresholdData);

            // Gửi qua MQTT
            const payload = {
                deviceId,
                THRESHOLD34: parseFloat(THRESHOLD34),
                THRESHOLD35: parseFloat(THRESHOLD35),
                THRESHOLD_HUMD: parseFloat(THRESHOLD_HUMD),
                THRESHOLD_TEMP: parseFloat(THRESHOLD_TEMP),
                timestamp: new Date().toISOString()
            };

            const result = this.mqttClient.publish(
                config.mqtt.topics.changeThreshold,
                JSON.stringify(payload)
            );

            logger.info(`Threshold changed for device: ${deviceId}`, payload);

            return {
                success: result,
                deviceId,
                thresholds: payload
            };
        } catch (error) {
            logger.error('Error in changeThreshold:', error);
            throw error;
        }
    }

    /**
     * Xử lý message từ MQTT broker (được gọi từ MQTTClient)
     */
    async handleIncomingMessage(topic, message) {
        try {
            const msg = message.toString();
            logger.info(`Processing MQTT [${topic}]: ${msg}`);

            const json = JSON.parse(msg);

            // Lấy hoặc tạo Device
            const deviceId = json.deviceId || 'esp32';
            const device = await deviceService.getOrCreateDevice(deviceId);

            // Cập nhật trạng thái device là online
            await deviceService.updateDeviceStatus(deviceId, 'online');

            // Xử lý theo topic
            if (topic === config.mqtt.topics.data) {
                await this.handleSensorData(device, json);
            } else if (topic === config.mqtt.topics.notification) {
                await this.handleNotification(device, json);
            } else if (topic === config.mqtt.topics.status) {
                await this.handleDeviceStatus(device, json);
            }

            return true;
        } catch (error) {
            logger.error('Error in handleIncomingMessage:', error);
            throw error;
        }
    }

    /**
     * Xử lý dữ liệu sensor
     */
    async handleSensorData(device, data) {
        try {
            // Lưu dữ liệu sensor
            const record = await airQualityService.createRecord(device._id, data);

            // Kiểm tra và tạo notification nếu vượt ngưỡng
            await this.checkThresholdsAndNotify(device, record, data);

            logger.info(`Sensor data saved for device: ${device.deviceId}`);
            return record;
        } catch (error) {
            logger.error('Error in handleSensorData:', error);
            throw error;
        }
    }

    /**
     * Xử lý notification từ device
     */
    async handleNotification(device, data) {
        try {
            // Lưu dữ liệu trước
            const dataRecord = await airQualityService.createRecord(device._id, data);

            // Xác định severity dựa trên event type
            const severity = this.determineSeverity(data.event);

            // Tạo notification
            await notificationService.createNotification(
                device._id,
                dataRecord._id,
                data.event,
                data.message || `Cảnh báo: ${data.event}`,
                severity
            );

            logger.info(`Notification created for device: ${device.deviceId}, event: ${data.event}`);
            return true;
        } catch (error) {
            logger.error('Error in handleNotification:', error);
            throw error;
        }
    }

    /**
     * Xử lý trạng thái device
     */
    async handleDeviceStatus(device, data) {
        try {
            const status = data.status || 'online';

            if (status === 'offline') {
                await deviceService.updateUptimeOnOffline(device.deviceId);
            } else {
                await deviceService.updateDeviceStatus(device.deviceId, status);
            }

            // Cập nhật metadata nếu có
            if (data.firmwareVersion || data.location) {
                await deviceService.updateDeviceMetadata(device.deviceId, {
                    firmwareVersion: data.firmwareVersion,
                    location: data.location
                });
            }

            logger.info(`Device status updated: ${device.deviceId} -> ${status}`);
            return true;
        } catch (error) {
            logger.error('Error in handleDeviceStatus:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra ngưỡng và tạo notification tự động
     */
    async checkThresholdsAndNotify(device, record, data) {
        try {
            const notifications = [];

            // Kiểm tra PM2.5
            if (data.pm25 && data.pm25 > 100) {
                notifications.push({
                    type: 'high_pm25',
                    message: `PM2.5 cao: ${data.pm25} µg/m³`,
                    severity: data.pm25 > 200 ? 'critical' : 'warning'
                });
            }

            // Kiểm tra MQ135
            if (data.mq135 && device.MQ135Threshold && data.mq135 > device.MQ135Threshold) {
                notifications.push({
                    type: 'high_mq135',
                    message: `MQ135 vượt ngưỡng: ${data.mq135} > ${device.MQ135Threshold}`,
                    severity: 'warning'
                });
            }

            // Kiểm tra MQ2
            if (data.mq2 && device.MQ2Threshold && data.mq2 > device.MQ2Threshold) {
                notifications.push({
                    type: 'high_mq2',
                    message: `MQ2 vượt ngưỡng: ${data.mq2} > ${device.MQ2Threshold}`,
                    severity: 'warning'
                });
            }

            // Kiểm tra nhiệt độ
            if (data.temp && device.TempThreshold && data.temp > device.TempThreshold) {
                notifications.push({
                    type: 'high_temperature',
                    message: `Nhiệt độ cao: ${data.temp}°C`,
                    severity: 'warning'
                });
            }

            // Kiểm tra độ ẩm
            if (data.humidity && device.HumThreshold && data.humidity > device.HumThreshold) {
                notifications.push({
                    type: 'high_humidity',
                    message: `Độ ẩm cao: ${data.humidity}%`,
                    severity: 'info'
                });
            }

            // Tạo notifications
            for (const notif of notifications) {
                await notificationService.createNotification(
                    device._id,
                    record._id,
                    notif.type,
                    notif.message,
                    notif.severity
                );
            }

            if (notifications.length > 0) {
                logger.info(`Created ${notifications.length} notifications for device: ${device.deviceId}`);
            }

            return notifications;
        } catch (error) {
            logger.error('Error in checkThresholdsAndNotify:', error);
            // Không throw error để không ảnh hưởng đến việc lưu dữ liệu
            return [];
        }
    }

    /**
     * Validate threshold values
     */
    validateThresholds(thresholds) {
        const { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP } = thresholds;

        if (THRESHOLD34 !== undefined && (isNaN(THRESHOLD34) || THRESHOLD34 < 0)) {
            throw new Error('THRESHOLD34 (MQ135) không hợp lệ');
        }

        if (THRESHOLD35 !== undefined && (isNaN(THRESHOLD35) || THRESHOLD35 < 0)) {
            throw new Error('THRESHOLD35 (MQ2) không hợp lệ');
        }

        if (THRESHOLD_HUMD !== undefined && (isNaN(THRESHOLD_HUMD) || THRESHOLD_HUMD < 0 || THRESHOLD_HUMD > 100)) {
            throw new Error('THRESHOLD_HUMD phải từ 0-100%');
        }

        if (THRESHOLD_TEMP !== undefined && (isNaN(THRESHOLD_TEMP) || THRESHOLD_TEMP < -50 || THRESHOLD_TEMP > 100)) {
            throw new Error('THRESHOLD_TEMP phải từ -50 đến 100°C');
        }

        return true;
    }

    /**
     * Xác định severity dựa trên event type
     */
    determineSeverity(eventType) {
        const criticalEvents = ['fire_detected', 'gas_leak', 'critical_pm25'];
        const warningEvents = ['high_pm25', 'high_mq135', 'high_mq2', 'high_temperature'];
        const infoEvents = ['high_humidity', 'device_online', 'threshold_changed'];

        if (criticalEvents.includes(eventType)) return 'critical';
        if (warningEvents.includes(eventType)) return 'warning';
        if (infoEvents.includes(eventType)) return 'info';

        return 'warning'; // Default
    }

    /**
     * Gửi command tùy chỉnh đến device
     */
    async sendCustomCommand(deviceId, command, params = {}) {
        try {
            if (!this.isReady()) {
                throw new Error('MQTT client chưa sẵn sàng');
            }

            const payload = {
                deviceId,
                command,
                params,
                timestamp: new Date().toISOString()
            };

            const result = this.mqttClient.publish(
                config.mqtt.topics.command || `iot/${deviceId}/command`,
                JSON.stringify(payload)
            );

            logger.info(`Custom command sent to device: ${deviceId}`, { command, params });

            return {
                success: result,
                deviceId,
                command,
                params
            };
        } catch (error) {
            logger.error('Error in sendCustomCommand:', error);
            throw error;
        }
    }

    /**
     * Publish message tùy chỉnh
     */
    async publishMessage(topic, payload) {
        try {
            if (!this.isReady()) {
                throw new Error('MQTT client chưa sẵn sàng');
            }

            const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const result = this.mqttClient.publish(topic, message);

            logger.info(`Message published to ${topic}`);

            return {
                success: result,
                topic,
                payload
            };
        } catch (error) {
            logger.error('Error in publishMessage:', error);
            throw error;
        }
    }
}

module.exports = new MQTTService();
