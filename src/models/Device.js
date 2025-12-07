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

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto update timestamp
DeviceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Device', DeviceSchema);
