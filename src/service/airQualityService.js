const AirQuality = require('../models/AirQualityData');
const logger = require('../utils/logger');

class AirQualityService {
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
                        avgDust: { $avg: '$dust' },
                        maxDust: { $max: '$dust' },
                        minDust: { $min: '$dust' },
                        avgMQ135: { $avg: '$mq135' },
                        maxMQ135: { $max: '$mq135' },
                        minMQ135: { $min: '$mq135' },
                        avgMQ2: { $avg: '$mq2' },
                        maxMQ2: { $max: '$mq2' },
                        minMQ2: { $min: '$mq2' },
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
