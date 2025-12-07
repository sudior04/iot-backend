const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const config = require('./config/config');
const MQTTClient = require('./mqtt/MQTTClient');
const AirQualityData = require('./models/AirQualityData');

// Khởi tạo Express app
const app = express();
const server = http.createServer(app);

// Socket.IO với CORS
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Data Store
const airQualityData = new AirQualityData();

// MQTT Client
const mqttClient = new MQTTClient(airQualityData, io);

// ===== REST API =====

app.get('/', (req, res) => {
    res.json({
        message: 'IoT Air Quality Monitoring Server',
        status: 'running',
        version: '1.0.0'
    });
});

// Dữ liệu mới nhất
app.get('/api/data/latest', (req, res) => {
    res.json({
        success: true,
        data: airQualityData.getLatestData(),
        airQuality: airQualityData.getAirQualityLevel()
    });
});

// Lịch sử
app.get('/api/data/history', (req, res) => {
    const { type, limit } = req.query;

    res.json({
        success: true,
        data: airQualityData.getHistory(type, limit ? parseInt(limit) : 50)
    });
});

// Xếp loại không khí
app.get('/api/air-quality', (req, res) => {
    res.json({
        success: true,
        airQuality: airQualityData.getAirQualityLevel(),
        pm25: airQualityData.getLatestData().pm25
    });
});

// Trạng thái MQTT
app.get('/api/mqtt/status', (req, res) => {
    res.json({
        success: true,
        mqtt: mqttClient.getStatus()
    });
});

// ===== PUBLISH CONTROL (chỉ cho phép 2 topic hợp lệ) =====
app.post('/api/mqtt/publish', (req, res) => {
    const { action, sensor, value } = req.body;

    if (!action) {
        return res.status(400).json({ success: false, error: "Thiếu action" });
    }

    if (action === "getData") {
        mqttClient.requestData();
    }
    else if (action === "changeThreshold") {
        if (!sensor || value === undefined) {
            return res.status(400).json({
                success: false,
                error: "Cần sensor và value để đổi threshold"
            });
        }
        mqttClient.sendChangeThreshold(sensor, value);
    }
    else {
        return res.status(400).json({
            success: false,
            error: "Action không hợp lệ"
        });
    }

    res.json({ success: true });
});

// ===== WebSocket =====
io.on('connection', (socket) => {
    console.log(`✓ Client kết nối: ${socket.id}`);

    socket.emit('initialData', {
        latestData: airQualityData.getLatestData(),
        airQuality: airQualityData.getAirQualityLevel()
    });

    socket.on('requestHistory', ({ type, limit }) => {
        socket.emit('historyData', airQualityData.getHistory(type, limit));
    });

    socket.on('disconnect', () => {
        console.log(`✗ Client ngắt: ${socket.id}`);
    });
});

// ===== Chạy server =====
server.listen(config.server.port, () => {
    console.log('='.repeat(50));
    console.log('🚀 IoT Server Running');
    console.log('='.repeat(50));
    console.log(`📡 HTTP: http://localhost:${config.server.port}`);
    console.log(`🔌 WebSocket: ws://localhost:${config.server.port}`);
    console.log('='.repeat(50));

    mqttClient.connect();
});

// ===== Tắt server =====
process.on('SIGINT', () => {
    console.log('\nĐang tắt server...');
    mqttClient.disconnect();
    server.close(() => process.exit(0));
});

module.exports = { app, server, io };
