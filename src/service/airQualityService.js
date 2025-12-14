const AirQuality = require('../models/AirQualityData');
const logger = require('../utils/logger');

/**
 * Air Quality Service - Xử lý logic nghiệp vụ liên quan đến dữ liệu chất lượng không khí
 */
class AirQualityService {
    /**
     * Lấy dữ liệu mới nhất
     */
    async getLatestData(deviceObjectId) {
        try {
            const latest = await AirQuality.findOne({ device: deviceObjectId })
                .sort({ createdAt: -1 });
            return latest;
        } catch (error) {
            logger.error('Error in getLatestData:', error);
            throw error;
        }
    }

    /**
     * Lấy lịch sử dữ liệu
     */
    async getHistory(deviceObjectId, limit = 50) {
        try {
            const history = await AirQuality.find({ device: deviceObjectId })
                .sort({ createdAt: -1 })
                .limit(limit);
            return history;
        } catch (error) {
            logger.error('Error in getHistory:', error);
            throw error;
        }
    }

    /**
     * Tạo bản ghi dữ liệu mới
     */
    async createRecord(deviceObjectId, data) {
        try {
            const record = await AirQuality.create({
                device: deviceObjectId,
                pm25: data.pm25 ? parseFloat(data.pm25) : null,
                MQ135: data.mq135 ? parseFloat(data.mq135) : null,
                MQ2: data.mq2 ? parseFloat(data.mq2) : null,
                temperature: data.temp ? parseFloat(data.temp) : null,
                humidity: data.humidity ? parseFloat(data.humidity) : null,
                THRESHOLD_MQ135: data.threshold34 ? parseFloat(data.threshold34) : null,
                THRESHOLD_MQ2: data.threshold35 ? parseFloat(data.threshold35) : null,
                THRESHOLD_TEMP: data.threshold_temperature ? parseFloat(data.threshold_temperature) : null,
                THRESHOLD_HUMD: data.threshold_humidity ? parseFloat(data.threshold_humidity) : null
            });
            return record;
        } catch (error) {
            logger.error('Error in createRecord:', error);
            throw error;
        }
    }

    /**
     * Lấy dữ liệu trong khoảng thời gian (Time Range Query)
     * @param {String} deviceObjectId - Device ID
     * @param {Date} startDate - Ngày bắt đầu
     * @param {Date} endDate - Ngày kết thúc
     * @param {Number} limit - Giới hạn số lượng bản ghi
     */
    async getDataByTimeRange(deviceObjectId, startDate, endDate, limit = 1000) {
        try {
            const query = {
                device: deviceObjectId,
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            const data = await AirQuality.find(query)
                .sort({ createdAt: -1 })
                .limit(limit);

            return data;
        } catch (error) {
            logger.error('Error in getDataByTimeRange:', error);
            throw error;
        }
    }

    /**
     * Lấy số liệu thống kê cho khoảng thời gian
     * @param {String} deviceObjectId - Device ID
     * @param {Date} startDate - Ngày bắt đầu
     * @param {Date} endDate - Ngày kết thúc
     */
    async getStatistics(deviceObjectId, startDate, endDate) {
        try {
            const query = {
                device: deviceObjectId,
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            const stats = await AirQuality.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        avgPM25: { $avg: '$pm25' },
                        maxPM25: { $max: '$pm25' },
                        minPM25: { $min: '$pm25' },
                        avgMQ135: { $avg: '$MQ135' },
                        maxMQ135: { $max: '$MQ135' },
                        minMQ135: { $min: '$MQ135' },
                        avgMQ2: { $avg: '$MQ2' },
                        maxMQ2: { $max: '$MQ2' },
                        minMQ2: { $min: '$MQ2' },
                        avgTemp: { $avg: '$temperature' },
                        maxTemp: { $max: '$temperature' },
                        minTemp: { $min: '$temperature' },
                        avgHumidity: { $avg: '$humidity' },
                        maxHumidity: { $max: '$humidity' },
                        minHumidity: { $min: '$humidity' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            return stats.length > 0 ? stats[0] : null;
        } catch (error) {
            logger.error('Error in getStatistics:', error);
            throw error;
        }
    }

    /**
     * Gợi ý ngưỡng tự động dựa trên dữ liệu lịch sử
     * Sử dụng phương pháp: Trung bình + 1.5 * Độ lệch chuẩn
     * @param {String} deviceObjectId - Device ID
     * @param {Number} days - Số ngày lịch sử để phân tích (mặc định 7 ngày)
     */
    async suggestThresholds(deviceObjectId, days = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const data = await AirQuality.find({
                device: deviceObjectId,
                createdAt: { $gte: startDate }
            });

            if (data.length < 10) {
                return {
                    message: 'Không đủ dữ liệu để gợi ý threshold (cần ít nhất 10 bản ghi)',
                    dataPoints: data.length
                };
            }

            // Tính toán thống kê
            const calculateStats = (values) => {
                const filtered = values.filter(v => v != null && !isNaN(v));
                if (filtered.length === 0) return null;

                const sum = filtered.reduce((a, b) => a + b, 0);
                const mean = sum / filtered.length;

                const variance = filtered.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / filtered.length;
                const stdDev = Math.sqrt(variance);

                // Ngưỡng = Trung bình + 1.5 * Độ lệch chuẩn
                const suggestedThreshold = mean + (1.5 * stdDev);

                return {
                    mean: Math.round(mean * 100) / 100,
                    stdDev: Math.round(stdDev * 100) / 100,
                    suggestedThreshold: Math.round(suggestedThreshold * 100) / 100,
                    max: Math.max(...filtered),
                    min: Math.min(...filtered)
                };
            };

            const suggestions = {
                MQ135: calculateStats(data.map(d => d.MQ135)),
                MQ2: calculateStats(data.map(d => d.MQ2)),
                temperature: calculateStats(data.map(d => d.temperature)),
                humidity: calculateStats(data.map(d => d.humidity)),
                pm25: calculateStats(data.map(d => d.pm25)),
                dataPoints: data.length,
                analyzedDays: days,
                generatedAt: new Date()
            };

            return suggestions;
        } catch (error) {
            logger.error('Error in suggestThresholds:', error);
            throw error;
        }
    }

    /**
     * Lấy dữ liệu theo nhóm thời gian (hourly, daily, weekly)
     * @param {String} deviceObjectId - Device ID
     * @param {String} groupBy - 'hour', 'day', 'week'
     * @param {Date} startDate - Ngày bắt đầu
     * @param {Date} endDate - Ngày kết thúc
     */
    async getGroupedData(deviceObjectId, groupBy = 'hour', startDate, endDate) {
        try {
            let dateFormat;
            switch (groupBy) {
                case 'hour':
                    dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
                    break;
                case 'day':
                    dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                    break;
                case 'week':
                    dateFormat = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
                    break;
                default:
                    dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
            }

            const query = {
                device: deviceObjectId,
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            const groupedData = await AirQuality.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: dateFormat,
                        avgPM25: { $avg: '$pm25' },
                        avgMQ135: { $avg: '$MQ135' },
                        avgMQ2: { $avg: '$MQ2' },
                        avgTemp: { $avg: '$temperature' },
                        avgHumidity: { $avg: '$humidity' },
                        maxPM25: { $max: '$pm25' },
                        maxMQ135: { $max: '$MQ135' },
                        maxMQ2: { $max: '$MQ2' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return groupedData;
        } catch (error) {
            logger.error('Error in getGroupedData:', error);
            throw error;
        }
    }
}

module.exports = new AirQualityService();
