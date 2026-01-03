const logger = require('../utils/logger');
const deviceService = require('./deviceService');
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

            const publishMs = Number(rate);
            if (Number.isNaN(publishMs) || publishMs < 2000 || publishMs > 600000) {
                throw new Error('publish_ms phải từ 2000–600000 ms');
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
