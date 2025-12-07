const mqtt = require('mqtt');
const config = require('../config/config');

class MQTTClient {
    constructor(dataStore, io) {
        this.dataStore = dataStore;
        this.io = io;
        this.client = null;
        this.isConnected = false;
    }

    connect() {
        const options = {
            clientId: `mqtt_backend_${Math.random().toString(16).slice(3)}`,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
        };

        // Thêm username và password nếu có
        if (config.mqtt.username) {
            options.username = config.mqtt.username;
            options.password = config.mqtt.password;
        }

        console.log(`Đang kết nối đến MQTT Broker: ${config.mqtt.brokerUrl}`);
        this.client = mqtt.connect(config.mqtt.brokerUrl, options);

        this.client.on('connect', () => {
            this.isConnected = true;
            console.log('✓ Đã kết nối thành công đến MQTT Broker');

            // Subscribe tất cả các topic
            this.client.subscribe(config.mqtt.topics.all, (err) => {
                if (!err) {
                    console.log(`✓ Đã subscribe topic: ${config.mqtt.topics.all}`);
                } else {
                    console.error('✗ Lỗi khi subscribe:', err);
                }
            });
        });

        this.client.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.client.on('error', (error) => {
            console.error('✗ Lỗi MQTT:', error);
        });

        this.client.on('offline', () => {
            this.isConnected = false;
            console.log('⚠ MQTT Client đang offline');
        });

        this.client.on('reconnect', () => {
            console.log('↻ Đang kết nối lại MQTT Broker...');
        });
    }

    handleMessage(topic, message) {
        try {
            const value = message.toString();
            console.log(`📨 Nhận được dữ liệu từ topic [${topic}]: ${value}`);

            let dataType = null;

            // Xác định loại dữ liệu dựa trên topic
            if (topic.includes('pm25')) {
                dataType = 'pm25';
            } else if (topic.includes('pm10')) {
                dataType = 'pm10';
            } else if (topic.includes('co')) {
                dataType = 'co';
            } else if (topic.includes('gas')) {
                dataType = 'gas';
            } else if (topic.includes('temperature')) {
                dataType = 'temperature';
            } else if (topic.includes('humidity')) {
                dataType = 'humidity';
            }

            if (dataType) {
                // Cập nhật dữ liệu trong store
                const updatedData = this.dataStore.updateData(dataType, value);

                // Gửi dữ liệu mới đến tất cả client qua WebSocket
                this.io.emit('airQualityUpdate', {
                    type: dataType,
                    value: parseFloat(value),
                    timestamp: new Date().toISOString(),
                    latestData: updatedData
                });

                console.log(`✓ Đã cập nhật và phát dữ liệu ${dataType}`);
            }
        } catch (error) {
            console.error('✗ Lỗi khi xử lý message:', error);
        }
    }

    publish(topic, message) {
        if (this.isConnected) {
            this.client.publish(topic, message, (err) => {
                if (err) {
                    console.error('✗ Lỗi khi publish message:', err);
                } else {
                    console.log(`✓ Đã gửi message đến topic [${topic}]: ${message}`);
                }
            });
        } else {
            console.error('✗ MQTT Client chưa kết nối');
        }
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            console.log('✓ Đã ngắt kết nối MQTT');
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
