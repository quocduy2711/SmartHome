const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const { authGuard, authorizeRoles } = require('../middleware/auth');

// ─── GET /api/rules – Lấy danh sách quy tắc ──────────────────────
router.get('/', authGuard, async (req, res, next) => {
  try {
    const rules = await Rule.find({ createdBy: req.user._id })
      .populate('deviceId', 'name type')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: rules.length,
      data: rules
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rules/:id – Lấy chi tiết quy tắc ───────────────────
router.get('/:id', authGuard, async (req, res, next) => {
  try {
    const rule = await Rule.findById(req.params.id)
      .populate('deviceId', 'name type mqttTopic')
      .populate('createdBy', 'username email');
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        msg: 'Không tìm thấy quy tắc'
      });
    }
    
    // Kiểm tra quyền: chỉ người tạo hoặc admin mới xem được
    if (rule.createdBy._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        msg: 'Không có quyền truy cập quy tắc này'
      });
    }
    
    res.json({
      success: true,
      data: rule
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/rules – Tạo quy tắc mới ──────────────────────────
router.post('/', authGuard, async (req, res, next) => {
  try {
    const {
      name,
      enabled,
      triggerType,
      time,
      days,
      sensorCondition,
      sensorValue,
      sensorType,
      faceCondition,
      deviceId,
      action
    } = req.body;

    // Validation
    if (!name || !triggerType || !deviceId || !action) {
      return res.status(400).json({
        success: false,
        msg: 'Vui lòng điền đầy đủ các trường bắt buộc: name, triggerType, deviceId, action'
      });
    }

    if (!['time', 'sensor', 'face'].includes(triggerType)) {
      return res.status(400).json({
        success: false,
        msg: 'triggerType phải là: time, sensor, hoặc face'
      });
    }

    if (!['on', 'off', 'toggle'].includes(action)) {
      return res.status(400).json({
        success: false,
        msg: 'action phải là: on, off, hoặc toggle'
      });
    }

    // Tạo rule mới
    const rule = new Rule({
      name,
      enabled: enabled !== undefined ? enabled : true,
      triggerType,
      time: triggerType === 'time' ? time : null,
      days: triggerType === 'time' ? days : [],
      sensorCondition: triggerType === 'sensor' ? sensorCondition : null,
      sensorValue: triggerType === 'sensor' ? sensorValue : null,
      sensorType: triggerType === 'sensor' ? sensorType : null,
      faceCondition: triggerType === 'face' ? faceCondition : null,
      deviceId,
      action,
      createdBy: req.user._id
    });

    await rule.save();
    await rule.populate('deviceId', 'name type');

    res.status(201).json({
      success: true,
      msg: 'Tạo quy tắc thành công',
      data: rule
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/rules/:id – Cập nhật quy tắc ─────────────────────
router.put('/:id', authGuard, async (req, res, next) => {
  try {
    const {
      name,
      enabled,
      triggerType,
      time,
      days,
      sensorCondition,
      sensorValue,
      sensorType,
      faceCondition,
      deviceId,
      action
    } = req.body;

    const rule = await Rule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        msg: 'Không tìm thấy quy tắc'
      });
    }

    // Kiểm tra quyền
    if (rule.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        msg: 'Không có quyền sửa quy tắc này'
      });
    }

    // Cập nhật các trường nếu được cung cấp
    if (name !== undefined) rule.name = name;
    if (enabled !== undefined) rule.enabled = enabled;
    if (triggerType !== undefined) rule.triggerType = triggerType;
    if (deviceId !== undefined) rule.deviceId = deviceId;
    if (action !== undefined) rule.action = action;

    // Cập nhật các trường dựa trên triggerType
    if (triggerType === 'time' || !triggerType) {
      if (time !== undefined) rule.time = time;
      if (days !== undefined) rule.days = days;
    }

    if (triggerType === 'sensor' || !triggerType) {
      if (sensorCondition !== undefined) rule.sensorCondition = sensorCondition;
      if (sensorValue !== undefined) rule.sensorValue = sensorValue;
      if (sensorType !== undefined) rule.sensorType = sensorType;
    }

    if (triggerType === 'face' || !triggerType) {
      if (faceCondition !== undefined) rule.faceCondition = faceCondition;
    }

    await rule.save();
    await rule.populate('deviceId', 'name type');

    res.json({
      success: true,
      msg: 'Cập nhật quy tắc thành công',
      data: rule
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/rules/:id – Xóa quy tắc ───────────────────────
router.delete('/:id', authGuard, async (req, res, next) => {
  try {
    const rule = await Rule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        msg: 'Không tìm thấy quy tắc'
      });
    }

    // Kiểm tra quyền
    if (rule.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        msg: 'Không có quyền xóa quy tắc này'
      });
    }

    await Rule.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      msg: 'Xóa quy tắc thành công'
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/rules/:id/toggle – Bật/Tắt quy tắc ──────────────
router.patch('/:id/toggle', authGuard, async (req, res, next) => {
  try {
    const rule = await Rule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        msg: 'Không tìm thấy quy tắc'
      });
    }

    // Kiểm tra quyền
    if (rule.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        msg: 'Không có quyền sửa quy tắc này'
      });
    }

    rule.enabled = !rule.enabled;
    await rule.save();
    await rule.populate('deviceId', 'name type');

    res.json({
      success: true,
      msg: `Quy tắc đã ${rule.enabled ? 'bật' : 'tắt'}`,
      data: rule
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
