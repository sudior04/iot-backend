const Device = require('../models/Device');
const AirQuality = require('../models/AirQualityData');
const logger = require('../utils/logger');

/**
 * Device Service - Xử lý logic nghiệp vụ liên quan đến device
 */
class DeviceService {
    /**
     * Lấy hoặc tạo device
     */
    async getOrCreateDevice(deviceId = 'esp32') {
        try {
            let device = await Device.findOne({ deviceId });

            if (!device) {
                logger.info(`Creating new device: ${deviceId}`);
                device = await Device.create({
                    deviceId,
                    MQ2Threshold: 1000,
                    MQ135Threshold: 1000,
                    HumThreshold: 70,
                    TempThreshold: 50
                });
            }

            return device;
        } catch (error) {
            logger.error('Error in getOrCreateDevice:', error);
            throw error;
        }
    }

    /**
     * Lấy device theo ID
     */
    async getDeviceById(deviceId) {
        try {
            const device = await Device.findOne({ deviceId });
            return device;
        } catch (error) {
            logger.error('Error in getDeviceById:', error);
            throw error;
        }
    }

    /**
     * Cập nhật threshold cho device
     */
    async updateThresholds(deviceId, thresholds) {
        try {
            const { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP } = thresholds;

            const device = await Device.findOneAndUpdate(
                { deviceId },
                {
                    MQ135Threshold: THRESHOLD34,
                    MQ2Threshold: THRESHOLD35,
                    HumThreshold: THRESHOLD_HUMD,
                    TempThreshold: THRESHOLD_TEMP
                },
                { new: true }
            );

            return device;
        } catch (error) {
            logger.error('Error in updateThresholds:', error);
            throw error;
        }
    }

    /**
     * Cập nhật trạng thái thiết bị
     */
    async updateDeviceStatus(deviceId, status) {
        try {
            const updateData = {
                status: status,
                updatedAt: new Date()
            };

            // Nếu chuyển sang online, cập nhật lastOnlineAt
            if (status === 'online') {
                updateData.lastOnlineAt = new Date();

                // Nếu lần đầu online, set firstOnlineAt
                const device = await Device.findOne({ deviceId });
                if (device && !device.firstOnlineAt) {
                    updateData.firstOnlineAt = new Date();
                }
            }

            const updatedDevice = await Device.findOneAndUpdate(
                { deviceId },
                updateData,
                { new: true }
            );

            return updatedDevice;
        } catch (error) {
            logger.error('Error in updateDeviceStatus:', error);
            throw error;
        }
    }

    /**
     * Lấy trạng thái và thời gian hoạt động của thiết bị
     */
    async getDeviceStatus(deviceId) {
        try {
            const device = await Device.findOne({ deviceId });
            if (!device) {
                throw new Error('Device not found');
            }

            const now = new Date();
            let currentUptime = 0;

            // Tính uptime hiện tại nếu device đang online
            if (device.status === 'online' && device.lastOnlineAt) {
                currentUptime = Math.floor((now - device.lastOnlineAt) / 1000);
            }

            // Tính tổng thời gian hoạt động
            const totalUptimeSeconds = (device.totalUptime || 0) + currentUptime;
            const uptimeHours = Math.floor(totalUptimeSeconds / 3600);
            const uptimeDays = Math.floor(uptimeHours / 24);

            return {
                deviceId: device.deviceId,
                status: device.status,
                lastOnlineAt: device.lastOnlineAt,
                firstOnlineAt: device.firstOnlineAt,
                currentUptimeSeconds: currentUptime,
                totalUptimeSeconds: totalUptimeSeconds,
                uptimeFormatted: {
                    days: uptimeDays,
                    hours: uptimeHours % 24,
                    minutes: Math.floor((totalUptimeSeconds % 3600) / 60),
                    seconds: totalUptimeSeconds % 60
                },
                firmwareVersion: device.firmwareVersion,
                location: device.location
            };
        } catch (error) {
            logger.error('Error in getDeviceStatus:', error);
            throw error;
        }
    }

    /**
     * Cập nhật uptime khi device offline
     */
    async updateUptimeOnOffline(deviceId) {
        try {
            const device = await Device.findOne({ deviceId });
            if (!device || !device.lastOnlineAt) {
                return null;
            }

            const now = new Date();
            const sessionUptime = Math.floor((now - device.lastOnlineAt) / 1000);
            const newTotalUptime = (device.totalUptime || 0) + sessionUptime;

            const updatedDevice = await Device.findOneAndUpdate(
                { deviceId },
                {
                    totalUptime: newTotalUptime,
                    status: 'offline',
                    updatedAt: now
                },
                { new: true }
            );

            return updatedDevice;
        } catch (error) {
            logger.error('Error in updateUptimeOnOffline:', error);
            throw error;
        }
    }

    /**
     * Lấy tất cả thiết bị với trạng thái
     */
    async getAllDevices() {
        try {
            const devices = await Device.find({});
            return devices;
        } catch (error) {
            logger.error('Error in getAllDevices:', error);
            throw error;
        }
    }

    /**
     * Cập nhật metadata của device
     */
    async updateDeviceMetadata(deviceId, metadata) {
        try {
            const updateData = {
                updatedAt: new Date()
            };

            if (metadata.firmwareVersion) updateData.firmwareVersion = metadata.firmwareVersion;
            if (metadata.location) updateData.location = metadata.location;
            if (metadata.description) updateData.description = metadata.description;

            const device = await Device.findOneAndUpdate(
                { deviceId },
                updateData,
                { new: true }
            );

            return device;
        } catch (error) {
            logger.error('Error in updateDeviceMetadata:', error);
            throw error;
        }
    }
}

module.exports = new DeviceService();
