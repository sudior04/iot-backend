const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    MQ2Threshold: { type: Number, default: 1000 },
    MQ135Threshold: { type: Number, default: 1000 },
    HumThreshold: { type: Number, default: 0 },
    TempThreshold: { type: Number, default: 0 },

    // Trạng thái thiết bị
    status: {
        type: String,
        enum: ['online', 'offline', 'error', 'maintenance'],
        default: 'offline'
    },

    // Thời gian hoạt động
    lastOnlineAt: { type: Date },
    firstOnlineAt: { type: Date },
    totalUptime: { type: Number, default: 0 }, // Tổng thời gian hoạt động (giây)

    // Metadata
    firmwareVersion: { type: String },
    location: { type: String },
    description: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto update timestamp
DeviceSchema.pre('save', function () {
    this.updatedAt = Date.now(); // không dùng next()
});

module.exports = mongoose.model('Device', DeviceSchema);
