// Middleware xử lý lỗi tập trung – đặt sau tất cả các route
const errorHandler = (err, req, res, next) => {
  console.error(`[LỖI] ${req.method} ${req.originalUrl} →`, err.message);

  // Lỗi validation của Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, msg: 'Dữ liệu không hợp lệ', errors: messages });
  }

  // Lỗi trùng khóa (duplicate key) của Mongoose
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, msg: `${field} đã tồn tại` });
  }

  // Lỗi CastError – ObjectId không hợp lệ
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, msg: `${err.path} không hợp lệ: ${err.value}` });
  }

  // Lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, msg: 'Token không hợp lệ' });
  }

  // Lỗi mặc định – 500 Internal Server Error
  res.status(err.statusCode || 500).json({
    success: false,
    msg: err.message || 'Lỗi máy chủ nội bộ'
  });
};

module.exports = errorHandler;
