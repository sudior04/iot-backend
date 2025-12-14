const express = require('express');
const http = require('http');
const cors = require('cors');
const config = require('./config/config');
const MQTTClient = require('./mqtt/MQTTClient');
const connectDB = require('./config/db.js');
const logger = require('./utils/logger');

// Middlewares
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Routes
const apiRoutes = require('./routes/index');

// Services
const mqttService = require('./service/mqttService');

// ===== Kết nối MongoDB =====
connectDB();

// Khởi tạo Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// ===== MQTT Setup =====
// Khởi tạo MQTT Client
const mqttClient = new MQTTClient();

// Kết nối mqttService với mqttClient (two-way binding)
mqttService.setMQTTClient(mqttClient);
mqttClient.setMQTTService(mqttService);

// Connect MQTT
mqttClient.connect();

// ===== API Routes =====
app.use('/api', apiRoutes);

// ===== Error Handlers =====
app.use(notFoundHandler);
app.use(errorHandler);

// Server listen
server.listen(config.server.port, () => {
    logger.info('='.repeat(50));
    logger.info('🚀 IoT Server Running');
    logger.info(`📡 HTTP: http://localhost:${config.server.port}`);
    logger.info('='.repeat(50));
});

// Tắt server
process.on('SIGINT', () => {
    logger.info('\nĐang tắt server...');
    mqttClient.disconnect();
    server.close(() => process.exit(0));
});

module.exports = { app, server };
