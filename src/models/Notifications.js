const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    data: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AirQuality',
        required: true
    },
    type: { type: String, required: true }, // Ví dụ: "high_pm25", "dangerous_gas", ...
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
