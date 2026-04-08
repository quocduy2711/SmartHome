const mongoose = require('mongoose');

/**
 * CommandLog – Lưu lịch sử tất cả lệnh điều khiển thiết bị
 * Mục đích: kiểm tra lịch sử, gỡ lỗi, phân tích hành vi người dùng
 */
const commandLogSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  // Người dùng hoặc hệ thống đã ra lệnh
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Nguồn gốc lệnh điều khiển
  source: {
    type: String,
    enum: ['api', 'websocket', 'automation', 'mqtt', 'system'],
    default: 'api'
  },
  action: {
    type: String,
    required: true // Ví dụ: 'turn_on', 'turn_off', 'set_speed', 'toggle'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed // Dữ liệu kèm theo lệnh: { isOn: true, speed: 2 }
  },
  mqttTopic: {
    type: String // Topic đã publish lệnh lên MQTT broker
  },
  // Kết quả thực thi lệnh
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'sent'
  },
  // Trạng thái thiết bị TRƯỚC khi thực thi lệnh
  previousState: {
    type: mongoose.Schema.Types.Mixed
  },
  // Trạng thái thiết bị SAU khi thực thi lệnh
  newState: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Chỉ mục kết hợp để truy vấn nhanh
commandLogSchema.index({ deviceId: 1, timestamp: -1 });
commandLogSchema.index({ issuedBy: 1, timestamp: -1 });

// Tự động xóa lịch sử cũ hơn 90 ngày
commandLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('CommandLog', commandLogSchema);
