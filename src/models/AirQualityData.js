const mongoose = require('mongoose');
const Device = require('./Device');

const AirQualitySchema = new mongoose.Schema({
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    MQ135: Number,
    MQ2: Number,
    humidity: Number,
    temperature: Number,
    pm25: Number,
    THRESHOLD_MQ135: Number,
    THRESHOLD_MQ2: Number,
    THRESHOLD_HUMD: Number,
    THRESHOLD_TEMP: Number,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AirQuality', AirQualitySchema);
