const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const SensorData = require('../models/SensorData');
const User = require('../models/User'); // Assume basic user schema
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- AUTH ROUTES ---
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // For simplicity - allow simple creation if don't exist
    let user = await User.findOne({ username });
    if (!user) {
        // Automatically create a test user mostly for development/demo ease!
        const hashedP = await bcrypt.hash(password, 10);
        user = await User.create({ username, password: hashedP });
    } else {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ msg: 'Invalid Credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MIDDLEWARE FOR API (Require Auth) ---
const authGuard = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// --- DEVICE ROUTES ---
// 1. Lấy danh sách thiết bị
router.get('/devices', authGuard, async (req, res) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Thêm thiết bị mới (Provisioning)
router.post('/devices', authGuard, async (req, res) => {
  try {
    const newDevice = await Device.create(req.body);
    res.status(201).json(newDevice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Khối điều khiển -> App gửi lệnh tới Backend để gửi qua MQTT (Relays, etc)
router.post('/devices/:id/control', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, payload } = req.body; // e.g., { action: "turn_on", payload: { isOn: true } }
    
    const device = await Device.findById(id);
    if (!device) return res.status(404).json({ msg: 'Device not found' });

    // Cập nhật Database
    device.state = payload;
    await device.save();

    // Gửi lệnh qua MQTT tới "Thiết bị trong nhà" (Khối xử lý trung tâm)
    const mqttService = req.app.get('mqttService');
    const commandTopic = `${device.mqttTopic}/command`;
    mqttService.publishCommand(commandTopic, { action, payload });

    res.json({ msg: 'Command sent', device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DASHBOARD / DATA ROUTES ---
// 4. Lấy dữ liệu lịch sử cảm biến (Cho Chart)
router.get('/data/history', authGuard, async (req, res) => {
  try {
    const { type, limit = 50 } = req.query; // type: temperature, humidity, etc.
    const query = type ? { type } : {};
    
    // Thu thập dữ liệu
    const data = await SensorData.find(query)
      .populate('deviceId', 'name type')
      .sort({ timestamp: -1 })
      .limit(Number(limit));
      
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Thống kê nhanh / Tổng quan AI vs Sensors
router.get('/data/summary', authGuard, async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments();
    const onlineDevices = await Device.countDocuments({ status: 'online' });
    
    // Get last Face Detect Event (Camera AI Block)
    const latestFaceDetect = await SensorData.findOne({ type: 'face_detected' })
                                             .sort({ timestamp: -1 })
                                             .populate('deviceId', 'name location');
                                             
    // Get latest average temp
    const latestTemp = await SensorData.findOne({ type: 'temperature' }).sort({ timestamp: -1 });

    res.json({
      totalDevices,
      onlineDevices,
      latestFaceDetect,
      latestTemp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
