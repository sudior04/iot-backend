require('dotenv').config();
const fs = require('fs');

module.exports = {
    server: {
        port: process.env.PORT || 3000
    },
    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtts://broker.hivemq.com:8883',

        // Auth
        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || '',

        // TLS Cert
        cert: fs.readFileSync(process.env.MQTT_CERT_PATH || './cert/ca.pem'),

        // Topics
        topics: {
            data: process.env.TOPIC_DATA || 'air-quality/data',                 
            notification: process.env.TOPIC_NOTIFICATION || 'air-quality/notify',
            getData: process.env.TOPIC_GETDATA || 'air-quality/cmd/getData',       
            changeThreshold: process.env.TOPIC_THRESHOLD || 'air-quality/cmd/threshold',
            all: process.env.MQTT_TOPIC_ALL || 'air-quality/#'
        }
    }
};
