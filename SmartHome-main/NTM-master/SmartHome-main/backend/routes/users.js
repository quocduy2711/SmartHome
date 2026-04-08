const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authGuard, authorizeRoles } = require('../middleware/auth');

// ============================================================
// GET /api/users – Lấy danh sách người dùng (chỉ Admin)
// ============================================================
router.get('/', authGuard, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const danhSach = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: danhSach.length, data: danhSach });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/users/:id – Lấy chi tiết người dùng (chỉ Admin)
// ============================================================
router.get('/:id', authGuard, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const nguoiDung = await User.findById(req.params.id);
    if (!nguoiDung) return res.status(404).json({ success: false, msg: 'Không tìm thấy người dùng' });
    res.json({ success: true, data: nguoiDung });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PUT /api/users/:id – Cập nhật vai trò hoặc trạng thái (chỉ Admin)
// ============================================================
router.put('/:id', authGuard, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const capNhat = {};
    if (role !== undefined)     capNhat.role = role;
    if (isActive !== undefined) capNhat.isActive = isActive;

    const nguoiDung = await User.findByIdAndUpdate(req.params.id, capNhat, {
      new: true,
      runValidators: true
    });
    if (!nguoiDung) return res.status(404).json({ success: false, msg: 'Không tìm thấy người dùng' });
    res.json({ success: true, data: nguoiDung });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DELETE /api/users/:id – Xóa người dùng (chỉ Admin)
// ============================================================
router.delete('/:id', authGuard, authorizeRoles('admin'), async (req, res, next) => {
  try {
    // Không cho phép admin tự xóa chính mình
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, msg: 'Không thể xóa tài khoản của chính mình' });
    }
    const nguoiDung = await User.findByIdAndDelete(req.params.id);
    if (!nguoiDung) return res.status(404).json({ success: false, msg: 'Không tìm thấy người dùng' });
    res.json({ success: true, msg: 'Đã xóa người dùng thành công' });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/users/theme – Cập nhật theme của user
// ============================================================
router.patch('/theme', authGuard, async (req, res, next) => {
  try {
    const { theme } = req.body;
    
    if (!theme || !['light', 'dark', 'system'].includes(theme)) {
      return res.status(400).json({
        success: false,
        msg: 'Theme phải là: light, dark, hoặc system'
      });
    }
    
    const nguoiDung = await User.findByIdAndUpdate(
      req.user._id,
      { theme },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      msg: 'Cập nhật theme thành công',
      data: { theme: nguoiDung.theme }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

