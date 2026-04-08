const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'Mã thiết bị là bắt buộc'],
    index: true
  },
  type: {
    type: String,
    // Loại dữ liệu cảm biến được hỗ trợ
    enum: ['temperature', 'humidity', 'motion', 'face_detected', 'light_level', 'door_status', 'air_quality'],
    required: [true, 'Loại cảm biến là bắt buộc'],
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true // Giá trị đo được: 25.4°C, true/false, tên người...
  },
  unit: {
    type: String // Đơn vị đo: "°C", "%", "lux"...
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // Dữ liệu phụ: độ tin cậy AI, tọa độ khuôn mặt...
  }
});

// Chỉ mục kết hợp để truy vấn chuỗi thời gian nhanh
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });
sensorDataSchema.index({ type: 1, timestamp: -1 });
sensorDataSchema.index({ deviceId: 1, type: 1, timestamp: -1 });

// Tự động xóa dữ liệu cũ hơn 30 ngày (TTL index)
sensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
