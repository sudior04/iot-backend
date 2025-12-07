require('dotenv').config();
const fs = require('fs');

module.exports = {
    server: {
        port: process.env.PORT || 3000
    },
    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:8883',
        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || '',
        cert: fs.readFileSync(process.env.MQTT_CERT_PATH || './cert/ca.pem'),
        topics: {
            pm25: process.env.TOPIC_PM25 || 'air-quality/pm25',
            pm10: process.env.TOPIC_PM10 || 'air-quality/pm10',
            mq135: process.env.TOPIC_CO || 'air-quality/co',
            gas: process.env.TOPIC_GAS || 'air-quality/gas',
            temperature: process.env.TOPIC_TEMPERATURE || 'air-quality/temperature',
            humidity: process.env.TOPIC_HUMIDITY || 'air-quality/humidity',
            all: process.env.MQTT_TOPIC || 'air-quality/#'
        }
    }
};
