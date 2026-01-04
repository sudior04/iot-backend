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
                config.mqtt.topics.alarmOff,
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
                MQ2Threshold: this.toNumber(thresholdData.MQ2Threshold),
                MQ135Threshold: this.toNumber(thresholdData.MQ135Threshold),
                HumThreshold: this.toNumber(thresholdData.HumThreshold),
                TempThreshold: this.toNumber(thresholdData.TempThreshold),
                DustThreshold: this.toNumber(thresholdData.DustThreshold),
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

    validateThresholds(th) {
        const check = (v, min, max, name) => {
            if (v !== undefined) {
                const n = Number(v);
                if (Number.isNaN(n) || n < min || (max !== undefined && n > max)) {
                    throw new Error(`${name} không hợp lệ`);
                }
            }
        };

        check(th.MQ2Threshold, 0, undefined, 'MQ2Threshold');
        check(th.MQ135Threshold, 0, undefined, 'MQ135Threshold');
        check(th.HumThreshold, 0, 100, 'HumThreshold');
        check(th.TempThreshold, -50, 100, 'TempThreshold');
        check(th.DustThreshold, 0, undefined, 'DustThreshold');
    }


    toNumber(v) {
        if (v === null || v === undefined || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    }
}

module.exports = new MQTTService();
