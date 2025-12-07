class AirQualityData {
    constructor() {
        this.latestData = {
            pm25: null,
            pm10: null,
            co: null,
            gas: null,
            temperature: null,
            humidity: null,
            timestamp: null
        };
        this.history = [];
        this.maxHistory = 100; // Giữ tối đa 100 bản ghi lịch sử
    }

    updateData(type, value) {
        const timestamp = new Date().toISOString();

        this.latestData[type] = {
            value: parseFloat(value),
            timestamp: timestamp
        };

        this.latestData.timestamp = timestamp;

        // Thêm vào lịch sử
        this.addToHistory({
            type,
            value: parseFloat(value),
            timestamp
        });

        return this.latestData;
    }

    addToHistory(data) {
        this.history.push(data);

        // Giới hạn kích thước lịch sử
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    getLatestData() {
        return this.latestData;
    }

    getHistory(type = null, limit = 50) {
        let filteredHistory = this.history;

        if (type) {
            filteredHistory = this.history.filter(item => item.type === type);
        }

        return filteredHistory.slice(-limit);
    }

    getAirQualityLevel() {
        const pm25Value = this.latestData.pm25?.value;

        if (!pm25Value) return { level: 'unknown', message: 'Không có dữ liệu' };

        // Theo tiêu chuẩn AQI (Air Quality Index)
        if (pm25Value <= 12) {
            return { level: 'good', message: 'Tốt', color: 'green' };
        } else if (pm25Value <= 35.4) {
            return { level: 'moderate', message: 'Trung bình', color: 'yellow' };
        } else if (pm25Value <= 55.4) {
            return { level: 'unhealthy-sensitive', message: 'Không tốt cho nhóm nhạy cảm', color: 'orange' };
        } else if (pm25Value <= 150.4) {
            return { level: 'unhealthy', message: 'Không tốt', color: 'red' };
        } else if (pm25Value <= 250.4) {
            return { level: 'very-unhealthy', message: 'Rất không tốt', color: 'purple' };
        } else {
            return { level: 'hazardous', message: 'Nguy hiểm', color: 'maroon' };
        }
    }
}

module.exports = AirQualityData;
