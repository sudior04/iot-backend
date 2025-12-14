const Notification = require('../models/Notifications');
const NotificationSettings = require('../models/NotificationSettings');
const logger = require('../utils/logger');

/**
 * Notification Service - Xử lý logic nghiệp vụ liên quan đến thông báo
 */
class NotificationService {
    /**
     * Lấy notifications theo device
     */
    async getNotifications(deviceObjectId, limit = 50, filters = {}) {
        try {
            const query = { device: deviceObjectId };

            // Lọc theo severity
            if (filters.severity) {
                query.severity = filters.severity;
            }

            // Lọc theo isRead
            if (filters.isRead !== undefined) {
                query.isRead = filters.isRead;
            }

            // Lọc theo type
            if (filters.type) {
                query.type = filters.type;
            }

            // Lọc theo thời gian
            if (filters.startDate && filters.endDate) {
                query.createdAt = {
                    $gte: new Date(filters.startDate),
                    $lte: new Date(filters.endDate)
                };
            }

            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('airQuality')
                .populate('device');

            return notifications;
        } catch (error) {
            logger.error('Error in getNotifications:', error);
            throw error;
        }
    }

    /**
     * Tạo notification mới với kiểm tra settings
     */
    async createNotification(deviceObjectId, airQualityId, eventType, message, severity = 'warning') {
        try {
            // Kiểm tra settings để xem có được phép gửi thông báo không
            const settings = await this.getNotificationSettings(deviceObjectId);

            if (!settings || !settings.enabled) {
                logger.info('Notifications are disabled for this device');
                return null;
            }

            // Kiểm tra quiet hours
            if (settings.quietHours && settings.quietHours.enabled) {
                const isQuietTime = this.isInQuietHours(settings.quietHours);
                if (isQuietTime) {
                    logger.info('Currently in quiet hours, notification skipped');
                    return null;
                }
            }

            // Kiểm tra loại thông báo có được bật không
            const notificationType = this.mapEventTypeToSetting(eventType);
            if (notificationType && settings.notificationTypes && !settings.notificationTypes[notificationType]) {
                logger.info(`Notification type ${notificationType} is disabled`);
                return null;
            }

            // Kiểm tra tần suất thông báo
            const recentCount = await this.getRecentNotificationCount(deviceObjectId, 60); // 60 phút
            if (recentCount >= (settings.maxNotificationsPerHour || 10)) {
                logger.info('Max notifications per hour reached');
                return null;
            }

            // Tạo notification
            const notification = await Notification.create({
                device: deviceObjectId,
                airQuality: airQualityId,
                type: eventType || 'alert',
                message: message || `Cảnh báo: ${eventType}`,
                severity: severity
            });

            return notification;
        } catch (error) {
            logger.error('Error in createNotification:', error);
            throw error;
        }
    }

    /**
     * Lấy cài đặt thông báo cho device
     */
    async getNotificationSettings(deviceObjectId, userId = null) {
        try {
            const query = { device: deviceObjectId };
            if (userId) {
                query.user = userId;
            }

            let settings = await NotificationSettings.findOne(query);

            // Nếu chưa có settings, tạo mới với giá trị mặc định
            if (!settings) {
                settings = await NotificationSettings.create({
                    device: deviceObjectId,
                    user: userId,
                    enabled: true
                });
            }

            return settings;
        } catch (error) {
            logger.error('Error in getNotificationSettings:', error);
            throw error;
        }
    }

    /**
     * Cập nhật cài đặt thông báo
     */
    async updateNotificationSettings(deviceObjectId, settingsData, userId = null) {
        try {
            const query = { device: deviceObjectId };
            if (userId) {
                query.user = userId;
            }

            const settings = await NotificationSettings.findOneAndUpdate(
                query,
                { ...settingsData, updatedAt: new Date() },
                { new: true, upsert: true }
            );

            return settings;
        } catch (error) {
            logger.error('Error in updateNotificationSettings:', error);
            throw error;
        }
    }

    /**
     * Bật/tắt thông báo cho device
     */
    async toggleNotifications(deviceObjectId, enabled, userId = null) {
        try {
            return await this.updateNotificationSettings(
                deviceObjectId,
                { enabled },
                userId
            );
        } catch (error) {
            logger.error('Error in toggleNotifications:', error);
            throw error;
        }
    }

    /**
     * Đánh dấu notification đã đọc
     */
    async markAsRead(notificationId) {
        try {
            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { isRead: true },
                { new: true }
            );
            return notification;
        } catch (error) {
            logger.error('Error in markAsRead:', error);
            throw error;
        }
    }

    /**
     * Đánh dấu tất cả notifications đã đọc
     */
    async markAllAsRead(deviceObjectId) {
        try {
            const result = await Notification.updateMany(
                { device: deviceObjectId, isRead: false },
                { isRead: true }
            );
            return result;
        } catch (error) {
            logger.error('Error in markAllAsRead:', error);
            throw error;
        }
    }

    /**
     * Xóa notification
     */
    async deleteNotification(notificationId) {
        try {
            await Notification.findByIdAndDelete(notificationId);
            return true;
        } catch (error) {
            logger.error('Error in deleteNotification:', error);
            throw error;
        }
    }

    /**
     * Xóa tất cả notifications cũ
     */
    async deleteOldNotifications(deviceObjectId, daysOld = 30) {
        try {
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - daysOld);

            const result = await Notification.deleteMany({
                device: deviceObjectId,
                createdAt: { $lt: dateThreshold }
            });

            return result;
        } catch (error) {
            logger.error('Error in deleteOldNotifications:', error);
            throw error;
        }
    }

    /**
     * Lấy số lượng notifications chưa đọc
     */
    async getUnreadCount(deviceObjectId) {
        try {
            const count = await Notification.countDocuments({
                device: deviceObjectId,
                isRead: false
            });
            return count;
        } catch (error) {
            logger.error('Error in getUnreadCount:', error);
            throw error;
        }
    }

    /**
     * Lấy số lượng notifications trong khoảng thời gian gần đây
     */
    async getRecentNotificationCount(deviceObjectId, minutes = 60) {
        try {
            const dateThreshold = new Date();
            dateThreshold.setMinutes(dateThreshold.getMinutes() - minutes);

            const count = await Notification.countDocuments({
                device: deviceObjectId,
                createdAt: { $gte: dateThreshold }
            });

            return count;
        } catch (error) {
            logger.error('Error in getRecentNotificationCount:', error);
            throw error;
        }
    }

    /**
     * Helper: Kiểm tra xem có trong quiet hours không
     */
    isInQuietHours(quietHours) {
        if (!quietHours || !quietHours.enabled) return false;

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const { startTime, endTime } = quietHours;

        // Nếu startTime < endTime: ví dụ 22:00 - 07:00 (qua đêm)
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime <= endTime;
        } else {
            // Nếu startTime > endTime: ví dụ 13:00 - 14:00 (trong ngày)
            return currentTime >= startTime && currentTime <= endTime;
        }
    }

    /**
     * Helper: Map event type sang notification type setting
     */
    mapEventTypeToSetting(eventType) {
        const mapping = {
            'high_pm25': 'pm25',
            'pm25_alert': 'pm25',
            'high_mq135': 'mq135',
            'mq135_alert': 'mq135',
            'high_mq2': 'mq2',
            'mq2_alert': 'mq2',
            'high_temperature': 'temperature',
            'temp_alert': 'temperature',
            'high_humidity': 'humidity',
            'humidity_alert': 'humidity',
            'device_offline': 'deviceOffline',
            'device_online': 'deviceOffline'
        };

        return mapping[eventType] || null;
    }

    /**
     * Lấy thống kê notifications
     */
    async getNotificationStats(deviceObjectId, days = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const stats = await Notification.aggregate([
                {
                    $match: {
                        device: deviceObjectId,
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        unreadCount: {
                            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                        }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            const totalCount = await Notification.countDocuments({
                device: deviceObjectId,
                createdAt: { $gte: startDate }
            });

            const unreadTotal = await Notification.countDocuments({
                device: deviceObjectId,
                isRead: false
            });

            return {
                byType: stats,
                total: totalCount,
                unreadTotal: unreadTotal,
                period: `${days} days`
            };
        } catch (error) {
            logger.error('Error in getNotificationStats:', error);
            throw error;
        }
    }
}

module.exports = new NotificationService();
