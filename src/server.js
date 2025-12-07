const express = require('express');
const http = require('http');
const cors = require('cors');
const config = require('./config/config');
const MQTTClient = require('./mqtt/MQTTClient');
const connectDB = require('./config/db.js');

// Models
const AirQuality = require('./models/AirQualityData.js');
const Device = require('./models/Device.js');
const Notification = require('./models/Notifications.js');

// ===== Kết nối MongoDB =====
connectDB();

// Khởi tạo Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// MQTT Client
const mqttClient = new MQTTClient(io = null); // Không cần Socket.IO
mqttClient.connect();

// ===== REST API =====
app.get('/', (req, res) => {
    res.json({
        message: 'IoT Air Quality Monitoring Server',
        status: 'running',
        version: '1.0.0'
    });
});

// Lấy dữ liệu mới nhất theo device
app.get('/api/data/latest/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    try {
        const device = await Device.findOne({ deviceId });
        if (!device) return res.status(404).json({ success: false, error: 'Device không tồn tại' });

        const latest = await AirQuality.findOne({ device: device._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: latest });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Lấy lịch sử dữ liệu
app.get('/api/data/history/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    try {
        const device = await Device.findOne({ deviceId });
        if (!device) return res.status(404).json({ success: false, error: 'Device không tồn tại' });

        const history = await AirQuality.find({ device: device._id }).sort({ createdAt: -1 }).limit(limit);
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Lấy notification theo device
app.get('/api/notifications/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    try {
        const device = await Device.findOne({ deviceId });
        if (!device) return res.status(404).json({ success: false, error: 'Device không tồn tại' });

        const notifications = await Notification.find({ device: device._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('airQuality');
        res.json({ success: true, data: notifications });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== PUBLISH CONTROL =====

// Gửi lệnh ESP32 lấy dữ liệu mới
app.post('/api/mqtt/getData', (req, res) => {
    try {
        mqttClient.publish(config.mqtt.topics.getData, JSON.stringify({})); // JSON rỗng
        res.json({ success: true, message: 'Đã gửi lệnh getData' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Gửi lệnh thay đổi threshold
app.post('/api/mqtt/changeThreshold', (req, res) => {
    const { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP } = req.body;

    if ([THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP].some(v => isNaN(v))) {
        return res.status(400).json({
            success: false,
            error: "Cần truyền đầy đủ các trường threshol2d"
        });
    }

    try {
        const msg = JSON.stringify({ THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP });
        mqttClient.publish(config.mqtt.topics.changeThreshold, msg);
        res.json({ success: true, message: 'Đã gửi lệnh changeThreshold', payload: msg });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// Server listen
server.listen(config.server.port, () => {
    console.log('='.repeat(50));
    console.log('🚀 IoT Server Running');
    console.log(`📡 HTTP: http://localhost:${config.server.port}`);
    console.log('='.repeat(50));
});

// Tắt server
process.on('SIGINT', () => {
    console.log('\nĐang tắt server...');
    mqttClient.disconnect();
    server.close(() => process.exit(0));
});

module.exports = { app, server };
