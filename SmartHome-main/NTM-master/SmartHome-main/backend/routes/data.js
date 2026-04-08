const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');
const Device = require('../models/Device');
const CommandLog = require('../models/CommandLog');
const { authGuard } = require('../middleware/auth');

// ============================================================
// GET /api/data/history – Lịch sử dữ liệu cảm biến
// Query: type, deviceId, limit, from, to
// ============================================================
router.get('/history', authGuard, async (req, res, next) => {
  try {
    const { type, deviceId, limit = 50, from, to } = req.query;

    const boLoc = {};
    if (type)     boLoc.type = type;
    if (deviceId) boLoc.deviceId = deviceId;
    if (from || to) {
      boLoc.timestamp = {};
      if (from) boLoc.timestamp.$gte = new Date(from);
      if (to)   boLoc.timestamp.$lte = new Date(to);
    }

    const duLieu = await SensorData.find(boLoc)
      .populate('deviceId', 'name type location')
      .sort({ timestamp: -1 })
      .limit(Math.min(Number(limit), 500)); // Giới hạn tối đa 500 bản ghi

    res.json({ success: true, count: duLieu.length, data: duLieu });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/data/summary – Tổng quan dashboard
// Trả về: số thiết bị, dữ liệu mới nhất, lịch sử lệnh gần đây
// ============================================================
router.get('/summary', authGuard, async (req, res, next) => {
  try {
    // Thực hiện tất cả truy vấn song song để tối ưu tốc độ
    const [
      tongThietBi,
      thietBiOnline,
      thietBiOffline,
      nhanDienKhuonMatMoiNhat,
      nhietDoMoiNhat,
      doAmMoiNhat,
      chuyenDongMoiNhat,
      tongLenhDieuKhien,
      lenhGanDay
    ] = await Promise.all([
      Device.countDocuments(),
      Device.countDocuments({ status: 'online' }),
      Device.countDocuments({ status: 'offline' }),
      SensorData.findOne({ type: 'face_detected' }).sort({ timestamp: -1 }).populate('deviceId', 'name location'),
      SensorData.findOne({ type: 'temperature' }).sort({ timestamp: -1 }),
      SensorData.findOne({ type: 'humidity' }).sort({ timestamp: -1 }),
      SensorData.findOne({ type: 'motion' }).sort({ timestamp: -1 }),
      CommandLog.countDocuments(),
      CommandLog.find().sort({ timestamp: -1 }).limit(5)
        .populate('deviceId', 'name type')
        .populate('issuedBy', 'username')
    ]);

    res.json({
      success: true,
      data: {
        thietBi: {
          tong: tongThietBi,
          online: thietBiOnline,
          offline: thietBiOffline
        },
        duLieuMoiNhat: {
          nhietDo:      nhietDoMoiNhat   ? { giatri: nhietDoMoiNhat.value,  donVi: nhietDoMoiNhat.unit,  thoiGian: nhietDoMoiNhat.timestamp }   : null,
          doAm:         doAmMoiNhat      ? { giatri: doAmMoiNhat.value,     donVi: doAmMoiNhat.unit,     thoiGian: doAmMoiNhat.timestamp }      : null,
          chuyenDong:   chuyenDongMoiNhat? { giatri: chuyenDongMoiNhat.value, thoiGian: chuyenDongMoiNhat.timestamp } : null,
          nhanDienMat:  nhanDienKhuonMatMoiNhat
        },
        lenhDieuKhien: {
          tong: tongLenhDieuKhien,
          ganDay: lenhGanDay
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/data/stats – Thống kê theo giờ (dùng cho biểu đồ)
// Query: type (mặc định: temperature), hours (mặc định: 24)
// ============================================================
router.get('/stats', authGuard, async (req, res, next) => {
  try {
    const { type = 'temperature', hours = 24 } = req.query;
    const tuLuc = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const thongKe = await SensorData.aggregate([
      {
        $match: {
          type,
          timestamp: { $gte: tuLuc },
          value: { $type: 'number' } // Chỉ lấy giá trị số
        }
      },
      {
        $group: {
          _id: {
            nam:   { $year:  '$timestamp' },
            thang: { $month: '$timestamp' },
            ngay:  { $dayOfMonth: '$timestamp' },
            gio:   { $hour:  '$timestamp' }
          },
          trungBinh: { $avg: '$value' },
          caoNhat:   { $max: '$value' },
          thapNhat:  { $min: '$value' },
          soBanGhi:  { $sum: 1 }
        }
      },
      { $sort: { '_id.nam': 1, '_id.thang': 1, '_id.ngay': 1, '_id.gio': 1 } }
    ]);

    res.json({ success: true, type, soGio: Number(hours), count: thongKe.length, data: thongKe });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/data/logs – Toàn bộ lịch sử lệnh điều khiển
// Dùng cho trang quản trị / admin dashboard
// ============================================================
router.get('/logs', authGuard, async (req, res, next) => {
  try {
    const { deviceId, limit = 50, from, to } = req.query;
    const boLoc = {};
    if (deviceId) boLoc.deviceId = deviceId;
    if (from || to) {
      boLoc.timestamp = {};
      if (from) boLoc.timestamp.$gte = new Date(from);
      if (to)   boLoc.timestamp.$lte = new Date(to);
    }

    const lichSu = await CommandLog.find(boLoc)
      .populate('deviceId', 'name type location')
      .populate('issuedBy', 'username role')
      .sort({ timestamp: -1 })
      .limit(Math.min(Number(limit), 200));

    res.json({ success: true, count: lichSu.length, data: lichSu });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
