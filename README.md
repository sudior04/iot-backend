# IoT Air Quality Monitoring Backend Server

Server backend cho hệ thống giám sát chất lượng không khí sử dụng MQTT và WebSocket để nhận dữ liệu từ thiết bị IoT và giao tiếp với client.

## 🌟 Tính năng

- ✅ Nhận dữ liệu từ thiết bị IoT qua MQTT
- ✅ Giao tiếp real-time với client qua WebSocket (Socket.IO)
- ✅ REST API để truy vấn dữ liệu
- ✅ Lưu trữ lịch sử dữ liệu
- ✅ Đánh giá chất lượng không khí theo tiêu chuẩn AQI
- ✅ Hỗ trợ các chỉ số: PM2.5, PM10, CO, Gas, Nhiệt độ, Độ ẩm

## 📋 Yêu cầu

- Node.js >= 14.x
- MQTT Broker (Mosquitto, HiveMQ, hoặc bất kỳ broker nào)

## 🚀 Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình

Tạo file `.env` từ file mẫu:

```bash
copy .env.example .env
```

Chỉnh sửa file `.env` với cấu hình của bạn:

```env
PORT=3000

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=air-quality/#
```

### 3. Chạy server

**Development mode (với nodemon):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## 📡 API Endpoints

### 1. Kiểm tra server
```
GET /
```

### 2. Lấy dữ liệu mới nhất
```
GET /api/data/latest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pm25": { "value": 25.5, "timestamp": "2025-12-07T10:30:00.000Z" },
    "pm10": { "value": 45.2, "timestamp": "2025-12-07T10:30:00.000Z" },
    "co": { "value": 1.2, "timestamp": "2025-12-07T10:30:00.000Z" },
    "gas": { "value": 350, "timestamp": "2025-12-07T10:30:00.000Z" },
    "temperature": { "value": 28.5, "timestamp": "2025-12-07T10:30:00.000Z" },
    "humidity": { "value": 65, "timestamp": "2025-12-07T10:30:00.000Z" }
  },
  "airQuality": {
    "level": "moderate",
    "message": "Trung bình",
    "color": "yellow"
  }
}
```

### 3. Lấy lịch sử dữ liệu
```
GET /api/data/history?type=pm25&limit=50
```

**Parameters:**
- `type` (optional): Loại dữ liệu (pm25, pm10, co, gas, temperature, humidity)
- `limit` (optional): Số lượng bản ghi (mặc định: 50)

### 4. Lấy chất lượng không khí
```
GET /api/air-quality
```

### 5. Kiểm tra trạng thái MQTT
```
GET /api/mqtt/status
```

### 6. Gửi message qua MQTT
```
POST /api/mqtt/publish
Content-Type: application/json

{
  "topic": "air-quality/control",
  "message": "ON"
}
```

## 🔌 WebSocket Events

### Client → Server

**Yêu cầu lịch sử dữ liệu:**
```javascript
socket.emit('requestHistory', {
  type: 'pm25',  // optional
  limit: 50      // optional
});
```

### Server → Client

**Dữ liệu ban đầu khi kết nối:**
```javascript
socket.on('initialData', (data) => {
  console.log(data.latestData);
  console.log(data.airQuality);
});
```

**Cập nhật dữ liệu real-time:**
```javascript
socket.on('airQualityUpdate', (data) => {
  console.log('Loại:', data.type);
  console.log('Giá trị:', data.value);
  console.log('Thời gian:', data.timestamp);
  console.log('Dữ liệu mới nhất:', data.latestData);
});
```

**Lịch sử dữ liệu:**
```javascript
socket.on('historyData', (history) => {
  console.log(history);
});
```

## 📊 MQTT Topics

Server subscribe các topic sau:

- `air-quality/pm25` - Bụi mịn PM2.5 (µg/m³)
- `air-quality/pm10` - Bụi mịn PM10 (µg/m³)
- `air-quality/co` - Khí CO (ppm)
- `air-quality/gas` - Khí gas (ppm)
- `air-quality/temperature` - Nhiệt độ (°C)
- `air-quality/humidity` - Độ ẩm (%)

### Định dạng message

Thiết bị IoT gửi dữ liệu dạng số đơn giản:
```
Topic: air-quality/pm25
Message: 25.5
```

## 📝 Ví dụ Client

### HTML/JavaScript Client

```html
<!DOCTYPE html>
<html>
<head>
    <title>Air Quality Monitor</title>
    <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
</head>
<body>
    <h1>Giám sát chất lượng không khí</h1>
    <div id="data"></div>

    <script>
        const socket = io('http://localhost:3000');

        socket.on('initialData', (data) => {
            console.log('Dữ liệu ban đầu:', data);
            updateDisplay(data.latestData);
        });

        socket.on('airQualityUpdate', (data) => {
            console.log('Cập nhật:', data);
            updateDisplay(data.latestData);
        });

        function updateDisplay(data) {
            document.getElementById('data').innerHTML = `
                <p>PM2.5: ${data.pm25?.value || 'N/A'} µg/m³</p>
                <p>PM10: ${data.pm10?.value || 'N/A'} µg/m³</p>
                <p>CO: ${data.co?.value || 'N/A'} ppm</p>
                <p>Gas: ${data.gas?.value || 'N/A'} ppm</p>
                <p>Nhiệt độ: ${data.temperature?.value || 'N/A'} °C</p>
                <p>Độ ẩm: ${data.humidity?.value || 'N/A'} %</p>
            `;
        }
    </script>
</body>
</html>
```

### Test với MQTT Client

Sử dụng mosquitto_pub để gửi dữ liệu test:

```bash
# Gửi dữ liệu PM2.5
mosquitto_pub -h localhost -t "air-quality/pm25" -m "25.5"

# Gửi dữ liệu nhiệt độ
mosquitto_pub -h localhost -t "air-quality/temperature" -m "28.5"
```

## 🔧 Cấu trúc thư mục

```
iot-backend/
├── src/
│   ├── config/
│   │   └── config.js          # Cấu hình server và MQTT
│   ├── models/
│   │   └── AirQualityData.js  # Model quản lý dữ liệu
│   ├── mqtt/
│   │   └── MQTTClient.js      # MQTT Client
│   └── server.js              # Entry point
├── .env.example               # File cấu hình mẫu
├── .gitignore
├── package.json
└── README.md
```

## 📈 Tiêu chuẩn đánh giá chất lượng không khí (AQI)

Dựa trên PM2.5:

| Mức độ | PM2.5 (µg/m³) | Màu sắc | Thông điệp |
|--------|---------------|---------|------------|
| Tốt | 0-12 | Xanh lá | Tốt |
| Trung bình | 12.1-35.4 | Vàng | Trung bình |
| Không tốt cho nhóm nhạy cảm | 35.5-55.4 | Cam | Không tốt cho nhóm nhạy cảm |
| Không tốt | 55.5-150.4 | Đỏ | Không tốt |
| Rất không tốt | 150.5-250.4 | Tím | Rất không tốt |
| Nguy hiểm | >250.4 | Nâu đỏ | Nguy hiểm |

## 🛠️ Troubleshooting

### Không kết nối được MQTT Broker

1. Kiểm tra MQTT Broker đang chạy
2. Kiểm tra URL, username, password trong `.env`
3. Kiểm tra firewall

### WebSocket không kết nối

1. Kiểm tra CORS settings
2. Đảm bảo client sử dụng đúng URL

## 📄 License

ISC

## 👨‍💻 Author

IoT Air Quality Monitoring System
