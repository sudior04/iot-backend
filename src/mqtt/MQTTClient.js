const mqtt = require('mqtt');
const fs = require('fs');
const config = require('../config/config');
const AirQuality = require('../models/AirQualityData.js');

class MQTTClient {
    constructor(dataStore, io) {
        this.dataStore = dataStore;
        this.io = io;
        this.client = null;
        this.isConnected = false;
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

        // TLS Cert
        if (config.mqtt.cert) {
            options.ca = config.mqtt.cert;
            console.log("Loaded CA certificate");
        }

        console.log(`Đang kết nối đến MQTT Broker: ${config.mqtt.brokerUrl}`);
        this.client = mqtt.connect(config.mqtt.brokerUrl, options);

        this.client.on("connect", () => {
            this.isConnected = true;
            console.log("MQTT đã kết nối");

            // SUBSCRIBE TẤT CẢ
            this.client.subscribe(config.mqtt.topics.all, err => {
                if (err) return console.error("Lỗi subscribe:", err);
                console.log(`Subscribe: ${config.mqtt.topics.all}`);
            });
        });

        this.client.on("message", (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.client.on("error", err => console.error("MQTT Error:", err));
        this.client.on("offline", () => this.isConnected = false);
        this.client.on("reconnect", () => console.log("Reconnecting MQTT..."));
    }

    async handleMessage(topic, message) {
        const msg = message.toString();
        console.log(`MQTT [${topic}]: ${msg}`);

        try {
            if (topic === config.mqtt.topics.data) {
                const json = JSON.parse(msg);

                const updated = this.dataStore.updateAll(json);

                await AirQuality.create({
                    deviceId: json.device,
                    pm25: json.pm25,
                    mq135: json.mq135,
                    mq2: json.mq2,
                    temperature: json.temperature,
                    humidity: json.humidity
                });

                this.io.emit("airQualityUpdate", {
                    type: "sensor_data",
                    data: updated,
                    timestamp: new Date()
                });

                return;
            }

            if (topic === config.mqtt.topics.notification) {
                const json = JSON.parse(msg);

                const dataRecord = await AirQuality.create({
                    deviceId: json.deviceId || "esp32",
                    MQ135: json.mq135 || null,
                    MQ2: json.mq2 || null,
                    temperature: json.temperature || null,
                    humidity: json.humidity || null,
                    pm25: json.pm25 || null
                });

                const notify = await Notification.create({
                    data: dataRecord._id,
                    type: json.type || "alert",
                    message: json.message || "ESP32 gửi cảnh báo"
                });

                this.io.emit("notification", {
                    ...json,
                    notificationId: notify._id,
                    dataId: dataRecord._id
                });

                return;
            }

        } catch (err) {
            console.error("Lỗi khi xử lý message:", err);
        }
    }


    // ========== PUBLISH COMMAND ==========
    publish(topic, message) {
        if (!this.isConnected) {
            console.error("MQTT chưa kết nối");
            return;
        }

        this.client.publish(topic, message, err => {
            if (err) console.error("Publish error:", err);
            else console.log(`Publish [${topic}]: ${message}`);
        });
    }

    // ========== SERVER → ESP32 ==========
    requestData() {
        this.publish(config.mqtt.topics.getData, "request");
    }

    sendChangeThreshold(sensor, newValue) {
        const msg = JSON.stringify({ sensor, threshold: newValue });
        this.publish(config.mqtt.topics.changeThreshold, msg);
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            console.log("MQTT Disconnected");
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
