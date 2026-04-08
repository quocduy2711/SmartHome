const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');
const { authGuard } = require('../middleware/auth');

// ============================================================
// GET /api/sensors/temperature – Lấy nhiệt độ và độ ẩm mới nhất
// ============================================================
router.get('/temperature', authGuard, async (req, res, next) => {
  try {
    // Lấy song song nhiệt độ và độ ẩm mới nhất
    const [tempData, humData] = await Promise.all([
      SensorData.findOne({ type: 'temperature' }).sort({ timestamp: -1 }),
      SensorData.findOne({ type: 'humidity' }).sort({ timestamp: -1 })
    ]);

    res.json({
      success: true,
      data: {
        temperature: tempData ? tempData.value : null,
        humidity: humData ? humData.value : null,
        timestamp: tempData ? tempData.timestamp : new Date()
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
