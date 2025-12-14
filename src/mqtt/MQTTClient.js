const mqtt = require('mqtt');
const config = require('../config/config');
const logger = require('../utils/logger');

class MQTTClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.mqttService = null;
    }

    /**
     * Set MQTT Service để xử lý business logic
     */
    setMQTTService(service) {
        this.mqttService = service;
    }

    connect() {
        const options = {
            clientId: `backend_${Math.random().toString(16).slice(3)}`,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
            username: config.mqtt.username,
            password: config.mqtt.password
        };

        if (config.mqtt.cert) options.ca = config.mqtt.cert;

        logger.info(`Đang kết nối đến MQTT Broker: ${config.mqtt.brokerUrl}`);
        this.client = mqtt.connect(config.mqtt.brokerUrl, options);

        this.client.on("connect", () => {
            this.isConnected = true;
            logger.info("MQTT đã kết nối");

            // Subscribe to all topics
            this.client.subscribe(config.mqtt.topics.all, err => {
                if (err) return logger.error("Lỗi subscribe:", err);
                logger.info(`Subscribe: ${config.mqtt.topics.all}`);
            });
        });

        this.client.on("message", (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.client.on("error", err => logger.error("MQTT Error:", err));
        this.client.on("offline", () => {
            this.isConnected = false;
            logger.warn("MQTT offline");
        });
        this.client.on("reconnect", () => logger.info("Reconnecting MQTT..."));
    }

    /**
     * Xử lý message - delegate sang mqttService
     */
    async handleMessage(topic, message) {
        const msg = message.toString();
        logger.info(`MQTT [${topic}]: ${msg}`);

        try {
            if (this.mqttService) {
                // Delegate sang service để xử lý business logic
                await this.mqttService.handleIncomingMessage(topic, message);
            } else {
                logger.warn('MQTT Service chưa được set, message không được xử lý');
            }
        } catch (err) {
            logger.error("Lỗi khi xử lý message:", err);
        }
    }


    publish(topic, message) {
        if (!this.isConnected) {
            logger.error("MQTT chưa kết nối");
            return false;
        }

        this.client.publish(topic, message, err => {
            if (err) {
                logger.error("Publish error:", err);
            } else {
                logger.info(`Publish [${topic}]: ${message}`);
            }
        });

        return true;
    }

    requestData() {
        return this.publish(config.mqtt.topics.getData, "request");
    }

    sendChangeThreshold(sensor, newValue) {
        const msg = JSON.stringify({ sensor, threshold: newValue });
        return this.publish(config.mqtt.topics.changeThreshold, msg);
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            logger.info("MQTT Disconnected");
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            brokerUrl: config.mqtt.brokerUrl
        };
    }
}

module.exports = MQTTClient;
