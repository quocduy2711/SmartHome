const Device = require('../models/Device');
const SensorData = require('../models/SensorData');
const CommandLog = require('../models/CommandLog');
const DeviceLog = require('../models/DeviceLog');

// ============================================================
// GET /api/devices
// Lấy danh sách thiết bị – hỗ trợ lọc theo loại, vị trí, trạng thái
// ============================================================
exports.getAllDevices = async (req, res, next) => {
  try {
    const { type, location, status } = req.query;
    const boLoc = {};
    if (type)     boLoc.type = type;
    if (location) boLoc.location = { $regex: location, $options: 'i' };
    if (status)   boLoc.status = status;

    const danhSach = await Device.find(boLoc).sort({ type: 1, name: 1 });
    res.json({ success: true, count: danhSach.length, data: danhSach });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/devices/:id
// Lấy chi tiết một thiết bị
// ============================================================
exports.getDeviceById = async (req, res, next) => {
  try {
    const thietBi = await Device.findById(req.params.id);
    if (!thietBi) {
      return res.status(404).json({ success: false, msg: 'Không tìm thấy thiết bị' });
    }
    res.json({ success: true, data: thietBi });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/devices/:id/history
// Lịch sử dữ liệu cảm biến của một thiết bị cụ thể
// ============================================================
exports.getDeviceHistory = async (req, res, next) => {
  try {
    const { limit = 50, type, from, to } = req.query;
    const boLoc = { deviceId: req.params.id };
    if (type) boLoc.type = type;
    if (from || to) {
      boLoc.timestamp = {};
      if (from) boLoc.timestamp.$gte = new Date(from);
      if (to)   boLoc.timestamp.$lte = new Date(to);
    }

    const lichSu = await SensorData.find(boLoc)
      .sort({ timestamp: -1 })
      .limit(Math.min(Number(limit), 200));

    res.json({ success: true, count: lichSu.length, data: lichSu });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/devices/:id/logs
// Lịch sử lệnh điều khiển của một thiết bị
// ============================================================
exports.getDeviceCommandLogs = async (req, res, next) => {
  try {
    const { limit = 30 } = req.query;
    const lichSuLenh = await CommandLog.find({ deviceId: req.params.id })
      .populate('issuedBy', 'username role')
      .sort({ timestamp: -1 })
      .limit(Math.min(Number(limit), 100));

    res.json({ success: true, count: lichSuLenh.length, data: lichSuLenh });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/devices/logs
// Lấy 50 log hoạt động gần nhất của toàn bộ hệ thống
// ============================================================
exports.getRecentLogs = async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const logs = await DeviceLog.find()
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 100));

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// POST /api/devices
// Thêm thiết bị mới vào hệ thống (chỉ Admin)
// ============================================================
exports.createDevice = async (req, res, next) => {
  try {
    const duLieu = { ...req.body, createdBy: req.user._id };
    const thietBiMoi = await Device.create(duLieu);
    res.status(201).json({ success: true, data: thietBiMoi });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PUT /api/devices/:id
// Cập nhật thông tin thiết bị (chỉ Admin)
// ============================================================
exports.updateDevice = async (req, res, next) => {
  try {
    const thietBi = await Device.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!thietBi) {
      return res.status(404).json({ success: false, msg: 'Không tìm thấy thiết bị' });
    }
    res.json({ success: true, data: thietBi });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// DELETE /api/devices/:id
// Xóa thiết bị khỏi hệ thống (chỉ Admin)
// ============================================================
exports.deleteDevice = async (req, res, next) => {
  try {
    const thietBi = await Device.findByIdAndDelete(req.params.id);
    if (!thietBi) {
      return res.status(404).json({ success: false, msg: 'Không tìm thấy thiết bị' });
    }
    res.json({ success: true, msg: 'Đã xóa thiết bị thành công' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// POST /api/devices/:id/control
// Gửi lệnh điều khiển tới thiết bị
// Body: { action: 'turn_on', payload: { isOn: true, speed: 2 } }
// Luồng: Kiểm tra DB → Cập nhật DB → Gửi MQTT → Lưu lịch sử → Broadcast WebSocket
// ============================================================
exports.controlDevice = async (req, res, next) => {
  try {
    const { action, payload = {} } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, msg: '"action" là bắt buộc' });
    }

    // Bước 1: Kiểm tra thiết bị có tồn tại trong database
    const thietBi = await Device.findById(req.params.id);
    if (!thietBi) {
      return res.status(404).json({ success: false, msg: 'Không tìm thấy thiết bị' });
    }

    const trangThaiCu = { ...thietBi.state };

    // Bước 2: Cập nhật trạng thái thiết bị trong database
    thietBi.state = { ...thietBi.state, ...payload };
    await thietBi.save();

    // Bước 3: Gửi lệnh đến MQTT broker → thiết bị vật lý thực thi
    const mqttService = req.app.get('mqttService');
    const topicLenh = `${thietBi.mqttTopic}/command`;
    const mqttDaGui = mqttService.publishCommand(topicLenh, {
      action,
      payload,
      deviceId: thietBi._id.toString()
    });

    // Bước 4: Lưu lịch sử điều khiển thiết bị
    await CommandLog.create({
      deviceId: thietBi._id,
      issuedBy: req.user._id,
      source: 'api',
      action,
      payload,
      mqttTopic: topicLenh,
      status: mqttDaGui ? 'sent' : 'failed',
      previousState: trangThaiCu,
      newState: thietBi.state,
      timestamp: new Date()
    });

    // Bước 4.5: Lưu DeviceLog (định dạng mới cho Activity History)
    if (action === 'turn_on' || action === 'turn_off') {
      await DeviceLog.create({
        deviceName: thietBi.name,
        deviceId: thietBi._id,
        action: action === 'turn_on' ? 'on' : 'off',
        room: thietBi.location,
        timestamp: new Date()
      });
    }

    // Bước 5: Phát sóng trạng thái mới tới frontend qua WebSocket
    const io = req.app.get('io');
    io.emit('deviceStateChanged', {
      deviceId: thietBi._id,
      name: thietBi.name,
      type: thietBi.type,
      location: thietBi.location,
      action,
      state: thietBi.state,
      timestamp: new Date()
    });

    if (!mqttDaGui) {
      return res.status(207).json({
        success: true,
        msg: 'Đã lưu trạng thái nhưng MQTT broker chưa kết nối – thiết bị có thể chưa nhận lệnh',
        data: thietBi
      });
    }

    res.json({ success: true, msg: `Lệnh "${action}" đã gửi thành công`, data: thietBi });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// POST /api/devices/:id/toggle
// Bật/Tắt nhanh thiết bị (tự động đảo ngược trạng thái isOn)
// ============================================================
exports.toggleDevice = async (req, res, next) => {
  try {
    // Bước 1: Kiểm tra thiết bị tồn tại
    const thietBi = await Device.findById(req.params.id);
    if (!thietBi) {
      return res.status(404).json({ success: false, msg: 'Không tìm thấy thiết bị' });
    }

    const trangThaiCu = { ...thietBi.state };
    const batMoi = !((thietBi.state || {}).isOn); // Đảo ngược trạng thái hiện tại
    const action = batMoi ? 'turn_on' : 'turn_off';

    // Bước 2: Cập nhật database
    thietBi.state = { ...thietBi.state, isOn: batMoi };
    await thietBi.save();

    // Bước 3: Gửi lệnh MQTT tới thiết bị vật lý
    const mqttService = req.app.get('mqttService');
    const topicLenh = `${thietBi.mqttTopic}/command`;
    const mqttDaGui = mqttService.publishCommand(topicLenh, {
      action,
      payload: { isOn: batMoi },
      deviceId: thietBi._id.toString()
    });

    // Bước 4: Lưu lịch sử
    await CommandLog.create({
      deviceId: thietBi._id,
      issuedBy: req.user._id,
      source: 'api',
      action,
      payload: { isOn: batMoi },
      mqttTopic: topicLenh,
      status: mqttDaGui ? 'sent' : 'failed',
      previousState: trangThaiCu,
      newState: thietBi.state,
      timestamp: new Date()
    });

    // Bước 4.5: Lưu DeviceLog
    await DeviceLog.create({
      deviceName: thietBi.name,
      deviceId: thietBi._id,
      action: batMoi ? 'on' : 'off',
      room: thietBi.location,
      timestamp: new Date()
    });

    // Bước 5: Phát sóng WebSocket
    const io = req.app.get('io');
    io.emit('deviceStateChanged', {
      deviceId: thietBi._id,
      name: thietBi.name,
      type: thietBi.type,
      location: thietBi.location,
      action,
      state: thietBi.state,
      timestamp: new Date()
    });

    res.json({
      success: true,
      msg: `${thietBi.name} đã ${batMoi ? '🟢 BẬT' : '🔴 TẮT'}`,
      data: thietBi
    });
  } catch (err) {
    next(err);
  }
};
