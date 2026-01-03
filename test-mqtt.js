// Test MQTT publish
const mqtt = require('mqtt');

console.log('🚀 Starting MQTT test...');

const client = mqtt.connect('mqtts://228185ea74cb4702b1c7e780ed322e4f.s1.eu.hivemq.cloud', {
    username: 'nguyenhieu',
    password: 'nguyenHieu0706',
    rejectUnauthorized: false
});

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');

    const testData = {
        deviceId: 101,
        event: "normal",
        temp: 21.75,
        humidity: 70,
        mq135: 1036,
        mq2: 679,
        dust: 446,
        publish_ms: 2000
    };

    console.log('📤 Publishing to topic: air-quality/data');
    console.log('📦 Test data:', JSON.stringify(testData, null, 2));

    client.publish('air-quality/data', JSON.stringify(testData), { qos: 1 }, (err) => {
        if (err) {
            console.error('❌ Publish error:', err);
        } else {
            console.log('✅ Message published successfully to air-quality/data');
        }

        setTimeout(() => {
            client.end();
            console.log('👋 Disconnected');
            process.exit(0);
        }, 2000);
    });
});

client.on('error', (err) => {
    console.error('❌ MQTT error:', err);
    process.exit(1);
});
