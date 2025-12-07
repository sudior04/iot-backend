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

// Cấu hình Socket.IO với CORS
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Khởi tạo data store
const airQualityData = new AirQualityData();

// Khởi tạo MQTT Client
const mqttClient = new MQTTClient(airQualityData, io);

// API Routes
app.get('/', (req, res) => {
    res.json({
        message: 'IoT Air Quality Monitoring Server',
        status: 'running',
        version: '1.0.0'
    });
});

// Lấy dữ liệu mới nhất
app.get('/api/data/latest', (req, res) => {
    const data = airQualityData.getLatestData();
    const quality = airQualityData.getAirQualityLevel();

    res.json({
        success: true,
        data: data,
        airQuality: quality
    });
});

// Lấy lịch sử dữ liệu
app.get('/api/data/history', (req, res) => {
    const { type, limit } = req.query;
    const history = airQualityData.getHistory(type, limit ? parseInt(limit) : 50);

    res.json({
        success: true,
        count: history.length,
        data: history
    });
});

// Lấy mức chất lượng không khí
app.get('/api/air-quality', (req, res) => {
    const quality = airQualityData.getAirQualityLevel();
    const latestData = airQualityData.getLatestData();

    res.json({
        success: true,
        airQuality: quality,
        pm25: latestData.pm25
    });
});

// Kiểm tra trạng thái MQTT
app.get('/api/mqtt/status', (req, res) => {
    const status = mqttClient.getStatus();
    res.json({
        success: true,
        mqtt: status
    });
});

// Gửi message qua MQTT (để điều khiển thiết bị nếu cần)
app.post('/api/mqtt/publish', (req, res) => {
    const { topic, message } = req.body;

    if (!topic || !message) {
        return res.status(400).json({
            success: false,
            error: 'Topic và message là bắt buộc'
        });
    }

    mqttClient.publish(topic, message.toString());

    res.json({
        success: true,
        message: 'Message đã được gửi'
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`✓ Client mới kết nối: ${socket.id}`);

    // Gửi dữ liệu mới nhất cho client vừa kết nối
    socket.emit('initialData', {
        latestData: airQualityData.getLatestData(),
        airQuality: airQualityData.getAirQualityLevel()
    });

    // Xử lý yêu cầu lấy lịch sử
    socket.on('requestHistory', (params) => {
        const history = airQualityData.getHistory(params?.type, params?.limit);
        socket.emit('historyData', history);
    });

    socket.on('disconnect', () => {
        console.log(`✗ Client ngắt kết nối: ${socket.id}`);
    });
});

// Khởi động server
server.listen(config.server.port, () => {
    console.log('='.repeat(50));
    console.log('🚀 IoT Air Quality Monitoring Server');
    console.log('='.repeat(50));
    console.log(`📡 HTTP Server đang chạy tại: http://localhost:${config.server.port}`);
    console.log(`🔌 WebSocket Server đang chạy tại: ws://localhost:${config.server.port}`);
    console.log('='.repeat(50));

    // Kết nối MQTT
    mqttClient.connect();
});

// Xử lý tắt server
process.on('SIGINT', () => {
    console.log('\n⚠ Đang tắt server...');
    mqttClient.disconnect();
    server.close(() => {
        console.log('✓ Server đã tắt');
        process.exit(0);
    });
});

module.exports = { app, server, io };
