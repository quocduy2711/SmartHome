const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ===== Xác thực JWT =====
const authGuard = async (req, res, next) => {
  try {
    // Hỗ trợ cả header "x-auth-token" và "Authorization: Bearer <token>"
    let token = req.header('x-auth-token');
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, msg: 'Không có token, từ chối truy cập' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lấy thông tin user mới nhất từ DB (đảm bảo user vẫn tồn tại và còn hoạt động)
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, msg: 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, msg: 'Token đã hết hạn' });
    }
    return res.status(401).json({ success: false, msg: 'Token không hợp lệ' });
  }
};

// ===== Phân quyền theo vai trò =====
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, msg: 'Chưa xác thực' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        msg: `Vai trò '${req.user.role}' không có quyền truy cập tài nguyên này`
      });
    }
    next();
  };
};

module.exports = { authGuard, authorizeRoles };
