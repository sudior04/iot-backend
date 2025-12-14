/**
 * API Response Messages
 */
const MESSAGES = {
    DEVICE_NOT_FOUND: 'Device không tồn tại',
    DEVICE_CREATED: 'Device đã được tạo thành công',

    DATA_RETRIEVED: 'Dữ liệu đã được lấy thành công',
    DATA_SAVED: 'Dữ liệu đã được lưu thành công',

    MQTT_COMMAND_SENT: 'Lệnh MQTT đã được gửi',
    MQTT_GET_DATA_SENT: 'Đã gửi lệnh getData',
    MQTT_THRESHOLD_SENT: 'Đã gửi lệnh changeThreshold',

    INVALID_THRESHOLD: 'Cần truyền đầy đủ các trường threshold',
    SERVER_ERROR: 'Lỗi máy chủ',
    VALIDATION_ERROR: 'Lỗi xác thực dữ liệu',
};

module.exports = MESSAGES;
