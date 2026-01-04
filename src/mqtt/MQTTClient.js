const mqtt = require('mqtt');
const config = require('../config/config');
const logger = require('../utils/logger');
const AirQuality = require('../models/AirQualityData');
const Notification = require('../models/Notifications');
const Device = require('../models/Device');

class MQTTClient {
    constructor(io) {
        this.client = null;
        this.isConnected = false;
        this.io = io;

        this.dataStore = {
            dust: null,
            mq135: null,
            mq2: null,
            temp: null,
            humidity: null,
            events: null,
            updateAll(data) {
                if (data.dust !== undefined) this.dust = data.dust;
                if (data.mq135 !== undefined) this.mq135 = data.mq135;
                if (data.mq2 !== undefined) this.mq2 = data.mq2;
                if (data.temp !== undefined) this.temp = data.temp;
                if (data.humidity !== undefined) this.humidity = data.humidity;
                if (data.events !== undefined) this.events = data.events;
                return {
                    dust: this.dust,
                    mq135: this.mq135,
                    mq2: this.mq2,
                    temp: this.temp,
                    humidity: this.humidity,
                    events: this.events
                };
            }
        };
    }

    connect() {
        const options = {
            clientId: `backend_${Math.random().toString(16).slice(3)}`,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
            username: config.mqtt.username,
            password: config.mqtt.password,
            rejectUnauthorized: config.mqtt.rejectUnauthorized
        };

        console.log('🔧 MQTT Config:', {
            brokerUrl: config.mqtt.brokerUrl,
            username: config.mqtt.username,
            rejectUnauthorized: config.mqtt.rejectUnauthorized,
            topics: config.mqtt.topics
        });

        logger.info(`MQTT connecting to ${config.mqtt.brokerUrl}`);
        this.client = mqtt.connect(config.mqtt.brokerUrl, options);

        this.client.on('connect', () => {
            this.isConnected = true;
            logger.info('✅ MQTT connected');

            this.client.subscribe(config.mqtt.topics.all, err => {
                if (err) return logger.error('Subscribe error:', err);
                logger.info(`Subscribed: ${config.mqtt.topics.all}`);
            });
        });

        this.client.on('message', (topic, message) => {
            console.log('🔔 MQTT on("message") triggered - Topic:', topic, 'Message length:', message.length);
            this.handleMessage(topic, message);
        });

        this.client.on('error', err => logger.error('MQTT error:', err));
        this.client.on('offline', () => {
            this.isConnected = false;
            logger.warn('MQTT offline');
        });
        this.client.on('reconnect', () => logger.info('MQTT reconnecting...'));
    }

    async handleMessage(topic, message) {
        const raw = message.toString();

        console.log('\n=== MQTT MESSAGE RECEIVED ===');
        console.log('Topic:', topic);
        console.log('Message:', raw);
        console.log('============================\n');

        try {
            let json;
            try {
                json = JSON.parse(raw);
            } catch {
                logger.warn('Non-JSON MQTT message, ignored');
                return;
            }

            if (
                topic === config.mqtt.topics.data ||
                topic.startsWith(config.mqtt.topics.data + '/')
            ) {
                const deviceId = String(json.deviceId || json.device || 'esp32');

                const sensorData = {
                    events: json.event || json.events || null,
                    dust: this.toNumber(json.dust || json.pm25),
                    mq135: this.toNumber(json.mq135),
                    mq2: this.toNumber(json.mq2),
                    temp: this.toNumber(json.temp || json.temperature),
                    humidity: this.toNumber(json.humidity)
                };

                console.log('📊 Normalized sensor data:', sensorData);

                const hasValue = Object.values(sensorData).some(v => typeof v === 'number');
                if (!hasValue) {
                    logger.warn('Sensor message without data, ignored');
                    return;
                }

                let device = await Device.findOne({ deviceId });
                if (!device) {
                    device = await Device.create({
                        deviceId,
                        name: deviceId,
                        type: 'esp32'
                    });
                }

                const record = await AirQuality.create({
                    device: device._id,
                    events: sensorData.events,
                    dust: sensorData.dust,
                    mq135: sensorData.mq135,
                    mq2: sensorData.mq2,
                    temp: sensorData.temp,
                    humidity: sensorData.humidity
                });

                logger.info(`Data saved [${deviceId}]: dust=${sensorData.dust} mq135=${sensorData.mq135} mq2=${sensorData.mq2} temp=${sensorData.temp} humidity=${sensorData.humidity}`);

                const updated = this.dataStore.updateAll(sensorData);

                this.io.emit('airQualityUpdate', {
                    deviceId,
                    data: updated,
                    timestamp: new Date()
                });

                logger.info(`Sensor data saved: ${deviceId}`);
                return;
            }

            if (topic === config.mqtt.topics.notification) {
                const deviceId = json.deviceId || 'esp32';

                let device = await Device.findOne({ deviceId });
                if (!device) {
                    device = await Device.create({
                        deviceId,
                        name: deviceId,
                        type: 'esp32'
                    });
                }

                const dataRecord = await AirQuality.create({
                    device: device._id,
                    dust: json.dust ?? null,
                    mq135: json.mq135 ?? null,
                    mq2: json.mq2 ?? null,
                    temperature: json.temperature ?? null,
                    humidity: json.humidity ?? null
                });

                const notify = await Notification.create({
                    data: dataRecord._id,
                    type: json.type || 'alert',
                    message: json.message || 'ESP32 cảnh báo'
                });

                this.io.emit('notification', {
                    ...json,
                    notificationId: notify._id
                });

                logger.info(`Notification created: ${notify._id}`);
                return;
            }

        } catch (err) {
            logger.error('MQTT handleMessage error:', err);
        }
    }

    publish(topic, message) {
        if (!this.isConnected) {
            logger.error('MQTT chưa kết nối');
            return false;
        }

        this.client.publish(topic, message, err => {
            if (err) logger.error('Publish error:', err);
            else logger.info(`Publish [${topic}]: ${message}`);
        });

        return true;
    }

    requestData() {
        return this.publish(
            config.mqtt.topics.getData,
            JSON.stringify({ command: 'GET_DATA' })
        );
    }

    sendAlarmOff() {
        return this.publish(
            config.mqtt.topics.alarmOff,
            JSON.stringify({ command: 'ALARM_OFF' })
        );
    }

    sendChangeRate(rate) {
        return this.publish(
            config.mqtt.topics.changeRate,
            JSON.stringify({ publish_ms: Number(rate) })
        );
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            logger.info('MQTT disconnected');
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            brokerUrl: config.mqtt.brokerUrl
        };
    }

    toNumber(v) {
        if (v === null || v === undefined || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    }
}

module.exports = MQTTClient;
