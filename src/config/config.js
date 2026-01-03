require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000
    },
    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtts://broker.hivemq.com:8883',

        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || '',

        rejectUnauthorized: false,

        topics: {
            data: process.env.TOPIC_DATA || 'air-quality/data',
            changeThreshold: process.env.TOPIC_CHANGE_THRESHOLD || 'air-quality/cmd/threshold',
            alarmOff: process.env.TOPIC_ALARM_OFF || 'air-quality/cmd/alarm_off',
            changeRate: process.env.TOPIC_RATE || 'air-quality/cmd/publish_rate',
            all: process.env.MQTT_TOPIC || 'air-quality/#'
        }
    }
};
