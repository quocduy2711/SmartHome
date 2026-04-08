const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên thiết bị là bắt buộc'],
    trim: true
  },
  type: {
    type: String,
    enum: ['sensor', 'camera', 'relay', 'light', 'fan', 'lock', 'thermostat'],
    required: [true, 'Loại thiết bị là bắt buộc']
  },
  location: {
    type: String,
    default: 'Chưa xác định' // Ví dụ: Phòng khách, Phòng ngủ
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'error'],
    default: 'offline'
  },
  state: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Trạng thái hiện tại: { isOn: true } hoặc { temp: 24 }
  },
  mqttTopic: {
    type: String,
    required: [true, 'MQTT topic là bắt buộc'],
    unique: true // Topic dùng để subscribe/publish lệnh điều khiển
  },
  lastSeen: {
    type: Date,
    default: Date.now // Lần cuối thiết bị gửi dữ liệu
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Người dùng đã thêm thiết bị này
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Cấu hình mở rộng của thiết bị
  },
  icon: {
    type: String,
    default: 'device' // Tên icon hiển thị trên giao diện
  }
}, { timestamps: true });

// Chỉ mục tăng tốc truy vấn
deviceSchema.index({ type: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ location: 1 });

module.exports = mongoose.model('Device', deviceSchema);
