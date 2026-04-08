const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Tên đăng nhập là bắt buộc'],
    unique: true,
    trim: true,
    minlength: [3, 'Tên đăng nhập phải có ít nhất 3 ký tự']
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Cho phép nhiều document có email null
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'viewer'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  refreshToken: {
    type: String
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'github'],
    default: 'local'
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  }
}, { timestamps: true });

// Tự động mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Phương thức so sánh mật khẩu khi đăng nhập
userSchema.methods.comparePassword = async function (matKhauNhap) {
  return bcrypt.compare(matKhauNhap, this.password);
};

// Ẩn các trường nhạy cảm khi trả về JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  return user;
};

module.exports = mongoose.model('User', userSchema);
