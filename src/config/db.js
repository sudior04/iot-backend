// src/config/db.js
const mongoose = require('mongoose');

const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        logger.info(`MongoDB Connected`);
    } catch (error) {
        console.error("MongoDB Error:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
