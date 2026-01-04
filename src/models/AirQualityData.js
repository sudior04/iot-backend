const mongoose = require('mongoose');
const Device = require('./Device');

const AirQualitySchema = new mongoose.Schema({
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    mq135: Number,
    mq2: Number,
    humidity: Number,
    temp: Number,
    dust: Number,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Air_Quality', AirQualitySchema);
