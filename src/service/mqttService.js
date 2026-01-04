const logger = require('../utils/logger');
const deviceService = require('./deviceService');
const airQualityService = require('./airQualityService');
const notificationService = require('./notificationService');
const config = require('../config/config');

class MQTTService {
    constructor() {
        this.mqttClient = null;
    }

    /* ===================== BASIC ===================== */

    setMQTTClient(client) {
        this.mqttClient = client;
    }

    isReady() {
        return this.mqttClient && this.mqttClient.isConnected;
    }

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

    /* ===================== COMMAND ===================== */

    async requestData(deviceId = 'esp32') {
        try {
            if (!this.isReady()) throw new Error('MQTT client chưa sẵn sàng');

            const payload = {
                deviceId,
                command: 'GET_DATA',
                timestamp: new Date().toISOString()
            };

            const result = this.mqttClient.publish(
                config.mqtt.topics.getData,
                JSON.stringify(payload)
            );

            logger.info(`GET_DATA sent to device: ${deviceId}`);

            return { success: result, deviceId };
        } catch (error) {
            logger.error('Error in requestData:', error);
            throw error;
        }
    }

    async sendAlarmOff(deviceId = 'esp32') {
        try {
            if (!this.isReady()) throw new Error('MQTT client chưa sẵn sàng');

            const payload = {
                deviceId,
                command: 'ALARM_OFF',
                timestamp: new Date().toISOString()
            };

            const result = this.mqttClient.publish(
                config.mqtt.topics.command,
                JSON.stringify(payload)
            );

            logger.info(`ALARM_OFF sent to device: ${deviceId}`);

            return { success: result, deviceId };
        } catch (error) {
            logger.error('Error in sendAlarmOff:', error);
            throw error;
        }
    }

    async changePublishRate(rate, deviceId = 'esp32') {
        try {
            if (!this.isReady()) throw new Error('MQTT client chưa sẵn sàng');

            const publishMs = Number(rate) * 1000;
            if (Number.isNaN(publishMs) || publishMs < 500 || publishMs > 60000) {
                throw new Error('publish_ms phải từ 0.5–60 s');
            }

            const payload = {
                deviceId,
                publish_ms: publishMs,
                timestamp: new Date().toISOString()
            };

            const result = this.mqttClient.publish(
                config.mqtt.topics.changeRate,
                JSON.stringify(payload)
            );

            logger.info(`Publish rate changed: ${deviceId} -> ${publishMs} ms`);

            return { success: result, deviceId, publish_ms: publishMs };
        } catch (error) {
            logger.error('Error in changePublishRate:', error);
            throw error;
        }
    }

    async changeThreshold(thresholdData, deviceId = 'esp32') {
        try {
            if (!this.isReady()) throw new Error('MQTT client chưa sẵn sàng');

            this.validateThresholds(thresholdData);

            await deviceService.updateThresholds(deviceId, thresholdData);

            const payload = {
                deviceId,
                THRESHOLD_MQ2: this.toNumber(thresholdData.THRESHOLD34),
                THRESHOLD_MQ135: this.toNumber(thresholdData.THRESHOLD35),
                THRESHOLD_HUMD: this.toNumber(thresholdData.THRESHOLD_HUMD),
                THRESHOLD_TEMP: this.toNumber(thresholdData.THRESHOLD_TEMP),
                THRESHOLD_DUST: this.toNumber(thresholdData.THRESHOLD_DUST),
                timestamp: new Date().toISOString()
            };

            const result = this.mqttClient.publish(
                config.mqtt.topics.changeThreshold,
                JSON.stringify(payload)
            );

            logger.info(`Threshold changed for device: ${deviceId}`, payload);

            return { success: result, deviceId, thresholds: payload };
        } catch (error) {
            logger.error('Error in changeThreshold:', error);
            throw error;
        }
    }

    async checkThresholdsAndNotify(device, record, data) {
        try {
            const notifications = [];

            // PM2.5 (dùng dust)
            if (data.dust !== undefined && data.dust > 100) {
                notifications.push({
                    type: 'high_pm25',
                    message: `PM2.5 cao: ${data.dust} µg/m³`,
                    severity: data.dust > 200 ? 'critical' : 'warning'
                });
            }

            if (data.mq135 !== undefined && device.MQ135Threshold && data.mq135 > device.MQ135Threshold) {
                notifications.push({
                    type: 'high_mq135',
                    message: `MQ135 vượt ngưỡng: ${data.mq135}`,
                    severity: 'warning'
                });
            }

            if (data.mq2 !== undefined && device.MQ2Threshold && data.mq2 > device.MQ2Threshold) {
                notifications.push({
                    type: 'high_mq2',
                    message: `MQ2 vượt ngưỡng: ${data.mq2}`,
                    severity: 'warning'
                });
            }

            if (data.temp !== undefined && device.TempThreshold && data.temp > device.TempThreshold) {
                notifications.push({
                    type: 'high_temperature',
                    message: `Nhiệt độ cao: ${data.temp}°C`,
                    severity: 'warning'
                });
            }

            if (data.humidity !== undefined && device.HumThreshold && data.humidity > device.HumThreshold) {
                notifications.push({
                    type: 'high_humidity',
                    message: `Độ ẩm cao: ${data.humidity}%`,
                    severity: 'info'
                });
            }

            for (const notif of notifications) {
                await notificationService.createNotification(
                    device._id,
                    record._id,
                    notif.type,
                    notif.message,
                    notif.severity
                );
            }

            return notifications;
        } catch (error) {
            logger.error('Error in checkThresholdsAndNotify:', error);
            return [];
        }
    }

    validateThresholds(th) {
        const check = (v, min, max, name) => {
            if (v !== undefined) {
                const n = Number(v);
                if (Number.isNaN(n) || n < min || (max !== undefined && n > max)) {
                    throw new Error(`${name} không hợp lệ`);
                }
            }
        };

        check(th.THRESHOLD34, 0, undefined, 'THRESHOLD34 (MQ2)');
        check(th.THRESHOLD35, 0, undefined, 'THRESHOLD35 (MQ135)');
        check(th.THRESHOLD_HUMD, 0, 100, 'THRESHOLD_HUMD');
        check(th.THRESHOLD_TEMP, -50, 100, 'THRESHOLD_TEMP');
        check(th.THRESHOLD_DUST, 0, undefined, 'THRESHOLD_DUST');
    }

    /* ===================== UTIL ===================== */

    toNumber(v) {
        if (v === null || v === undefined || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    }
}

module.exports = new MQTTService();
