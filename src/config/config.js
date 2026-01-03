require('dotenv').config();
const fs = require('fs');
const path = require('path');

const certPath = process.env.MQTT_CERT_PATH
    ? process.env.MQTT_CERT_PATH
    : path.join(__dirname, '../../cert/ca.pem');

module.exports = {
    server: {
        port: process.env.PORT || 3000
    },
    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtts://broker.hivemq.com:8883',

        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || '',

        cert: fs.readFileSync(certPath),

        topics: {
            data: process.env.TOPIC_DATA,
            changeThreshold: process.env.TOPIC_CHANGE_THRESHOLD,
            alarmOff: process.env.TOPIC_ALARM_OFF,
            changeRate: process.env.TOPIC_RATE,

            all: process.env.MQTT_TOPIC
        }
    }
};
