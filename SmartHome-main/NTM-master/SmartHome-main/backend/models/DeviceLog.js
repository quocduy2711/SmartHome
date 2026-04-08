const mongoose = require('mongoose');

const deviceLogSchema = new mongoose.Schema({
  deviceName: {
    type: String,
    required: true
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  action: {
    type: String,
    enum: ['on', 'off'],
    required: true
  },
  room: {
    type: String,
    default: 'Chưa xác định'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

deviceLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('DeviceLog', deviceLogSchema);
