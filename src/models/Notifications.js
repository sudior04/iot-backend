const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true
    },
    airQuality: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AirQuality',
        required: true
    },
    type: { type: String, required: true }, // Ví dụ: "high_pm25", "dangerous_gas", ...
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    severity: {
        type: String,
        enum: ['info', 'warning', 'danger', 'critical'],
        default: 'warning'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
