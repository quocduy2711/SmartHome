const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên quy tắc là bắt buộc'],
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  triggerType: {
    type: String,
    enum: ['time', 'sensor', 'face'],
    required: [true, 'Loại trigger là bắt buộc']
  },
  // For time-based rules
  time: {
    type: String, // Format: "HH:mm"
    default: null
  },
  days: {
    type: [String], // ['8', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    default: []
  },
  // For sensor-based rules
  sensorCondition: {
    type: String,
    enum: ['>', '<', '>=', '<=', '=='],
    default: null
  },
  sensorValue: {
    type: Number,
    default: null
  },
  sensorType: {
    type: String,
    enum: ['temperature', 'humidity', 'light', 'motion'],
    default: null
  },
  // For face-based rules
  faceCondition: {
    type: String,
    enum: ['detected', 'not_detected'],
    default: null
  },
  // Action
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'ID thiết bị là bắt buộc']
  },
  action: {
    type: String,
    enum: ['on', 'off', 'toggle'],
    required: [true, 'Action là bắt buộc']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người tạo là bắt buộc']
  }
}, { timestamps: true });

module.exports = mongoose.model('Rule', ruleSchema);
