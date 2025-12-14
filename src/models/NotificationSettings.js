const mongoose = require('mongoose');

/**
 * Notification Settings Schema - Cài đặt bật/tắt thông báo cho từng device và user
 */
const NotificationSettingsSchema = new mongoose.Schema({
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Cài đặt bật/tắt theo loại thông báo
    enabled: { type: Boolean, default: true },

    notificationTypes: {
        pm25: { type: Boolean, default: true },
        mq135: { type: Boolean, default: true },
        mq2: { type: Boolean, default: true },
        temperature: { type: Boolean, default: true },
        humidity: { type: Boolean, default: true },
        deviceOffline: { type: Boolean, default: true }
    },

    // Quiet hours - Không gửi thông báo trong khoảng thời gian
    quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String }, // Format: "22:00"
        endTime: { type: String }    // Format: "07:00"
    },

    // Tần suất thông báo tối đa
    maxNotificationsPerHour: { type: Number, default: 10 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index để tìm nhanh
NotificationSettingsSchema.index({ device: 1, user: 1 });

// Auto update timestamp
NotificationSettingsSchema.pre('save', function () {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema);
