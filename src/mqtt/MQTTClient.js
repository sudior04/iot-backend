const mqtt = require('mqtt');
const config = require('../config/config');
const AirQuality = require('../models/AirQualityData.js');
const Device = require('../models/Device.js');
const Notification = require('../models/Notifications.js');

class MQTTClient {
    constructor() {
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

        if (config.mqtt.cert) options.ca = config.mqtt.cert;

        console.log(`Đang kết nối đến MQTT Broker: ${config.mqtt.brokerUrl}`);
        this.client = mqtt.connect(config.mqtt.brokerUrl, options);

        this.client.on("connect", () => {
            this.isConnected = true;
            console.log("MQTT đã kết nối");

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
        const json = JSON.parse(msg);

        // Lấy hoặc tạo Device
        let device = await Device.findOne({ deviceId: json.deviceId || "esp32" });
        if (!device) {
            device = await Device.create({
                deviceId: json.deviceId || "esp32",
                MQ2Threshold: 1000,
                MQ135Threshold: 1000,
                HumThreshold: 70,
                TempThreshold: 50
            });
        }

        // Nếu là dữ liệu sensor
        if (topic === config.mqtt.topics.data) {
            await AirQuality.create({
                device: device._id,
                pm25: json.pm25 ? parseFloat(json.pm25) : null,
                MQ135: json.mq135 ? parseFloat(json.mq135) : null,
                MQ2: json.mq2 ? parseFloat(json.mq2) : null,
                temperature: json.temp ? parseFloat(json.temp) : null,
                humidity: json.humidity ? parseFloat(json.humidity) : null
            });
        }

        // Nếu là notification
        if (topic === config.mqtt.topics.notification) {
            const dataRecord = await AirQuality.create({
                device: device._id,
                pm25: json.pm25 ? parseFloat(json.pm25) : null,
                MQ135: json.mq135 ? parseFloat(json.mq135) : null,
                MQ2: json.mq2 ? parseFloat(json.mq2) : null,
                temperature: json.temp ? parseFloat(json.temp) : null,
                humidity: json.humidity ? parseFloat(json.humidity) : null,
                THRESHOLD_MQ135: json.threshold34 ? parseFloat(json.threshold34) : null,
                THRESHOLD_MQ2: json.threshold35 ? parseFloat(json.threshold35) : null,
                THRESHOLD_TEMP: json.threshold_temperature ? parseFloat(json.threshold_temperature) : null,
                THRESHOLD_HUMD: json.threshold_humidity ? parseFloat(json.threshold_humidity) : null
            });

            await Notification.create({
                device: device._id,
                airQuality: dataRecord._id, // chắc chắn không undefined
                type: json.event || "alert",
                message: `Cảnh báo: ${json.event}`
            });
        }

    } catch (err) {
        console.error("Lỗi khi xử lý message:", err);
    }
}


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
