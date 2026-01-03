const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const config = require('./config/config');
const MQTTClient = require('./mqtt/MQTTClient');
const connectDB = require('./config/db.js');
const logger = require('./utils/logger');

const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const apiRoutes = require('./routes/index');
const mqttService = require('./service/mqttService');

connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// 🔹 MQTT Client (xử lý incoming messages & lưu DB)
const mqttClient = new MQTTClient(io);
mqttClient.connect();

// 🔹 MQTT Service (gửi commands)
mqttService.setMQTTClient(mqttClient);

// 🔹 Socket.IO
io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        logger.info(`Socket client disconnected: ${socket.id}`);
    });
});

// 🔹 API
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// 🔹 Start server
server.listen(config.server.port, () => {
    logger.info('='.repeat(50));
    logger.info('🚀 IoT Server Running');
    logger.info(`📡 HTTP: http://localhost:${config.server.port}`);
    logger.info('='.repeat(50));
});

// 🔹 Graceful shutdown
process.on('SIGINT', () => {
    logger.info('\nĐang tắt server...');
    mqttClient.disconnect();
    server.close(() => process.exit(0));
});

module.exports = { app, server };
