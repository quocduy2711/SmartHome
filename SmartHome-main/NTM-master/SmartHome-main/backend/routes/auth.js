const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authGuard } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Lưu tạm thời OTP trên RAM (cho việc demo/chạy thử)
const otpStore = new Map();

// ============================================================
// POST /api/auth/send-otp – Gửi mã OTP vào Email
// ============================================================
router.post('/send-otp', async (req, res, next) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ success: false, msg: 'Cần cung cấp username và email' });
    }

    // Kiểm tra xem username/email đã tồn tại chưa
    const daTonTai = await User.findOne({ $or: [{ username }, { email }] });
    if (daTonTai) {
      return res.status(400).json({ success: false, msg: 'Tên đăng nhập hoặc Email đã được sử dụng' });
    }

    // Tạo mã OTP 6 số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, otpCode);

    console.log(`\n===========================================`);
    console.log(` 📧 MÃ OTP GỬI CHO [${email}] LÀ: ${otpCode} `);
    console.log(`===========================================\n`);

    // Gửi email thật sự nếu có cấu hình SMTP (nếu không có thì in ra Console để Dev dễ làm)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      let transporter = nodemailer.createTransport({
        service: 'gmail', // Hoặc host của bạn
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: '"Hệ thống NEXUS" <no-reply@smarthome.local>',
        to: email,
        subject: "Mã Xác Nhận Đăng Ký Nhà Thông Minh",
        text: `Mã OTP của bạn là: ${otpCode}. Mã này có hiệu lực 5 phút.`,
      });
    }

    res.json({ success: true, msg: 'Đã gửi mã xác nhận tới Gmail của bạn.' });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/auth/register – Đăng ký tài khoản mới qua OTP
// ============================================================
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, role, otp } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ success: false, msg: 'Vui lòng nhập đầy đủ thông tin' });
    }

    // Kiểm tra mã OTP
    if (!otp || otpStore.get(email) !== otp) {
      return res.status(400).json({ success: false, msg: 'Mã xác thực không đúng hoặc đã hết hạn' });
    }

    // Kiểm tra tên đăng nhập hoặc email đã tồn tại chưa
    const nguoiDungCu = await User.findOne({ $or: [{ username }, { email }] });
    if (nguoiDungCu) {
      return res.status(400).json({ success: false, msg: 'Tên đăng nhập hoặc email đã được sử dụng' });
    }

    const nguoiDung = await User.create({ username, email, password, role });
    
    // Xóa OTP khỏi bộ nhớ sau khi đăng ký thành công
    otpStore.delete(email);

    // Tạo JWT token sau khi đăng ký thành công
    const token = jwt.sign({ id: nguoiDung._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      success: true,
      msg: 'Đăng ký tài khoản thành công',
      token,
      user: nguoiDung
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/auth/login – Đăng nhập
// ============================================================
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, msg: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    // Tìm user theo tên đăng nhập
    const nguoiDung = await User.findOne({ username });
    if (!nguoiDung) {
      return res.status(401).json({ success: false, msg: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    if (!nguoiDung.isActive) {
      return res.status(403).json({ success: false, msg: 'Tài khoản đã bị vô hiệu hóa' });
    }

    // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa
    const hopLe = await nguoiDung.comparePassword(password);
    if (!hopLe) {
      return res.status(401).json({ success: false, msg: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    // Cập nhật lần đăng nhập cuối
    nguoiDung.lastLogin = new Date();
    await nguoiDung.save({ validateBeforeSave: false });

    const token = jwt.sign({ id: nguoiDung._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      success: true,
      msg: 'Đăng nhập thành công',
      token,
      user: nguoiDung
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/auth/me – Lấy thông tin người dùng hiện tại
// ============================================================
router.get('/me', authGuard, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ============================================================
// PUT /api/auth/change-password – Đổi mật khẩu
// ============================================================
router.put('/change-password', authGuard, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, msg: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }

    const nguoiDung = await User.findById(req.user._id);
    const hopLe = await nguoiDung.comparePassword(currentPassword);
    if (!hopLe) {
      return res.status(401).json({ success: false, msg: 'Mật khẩu hiện tại không đúng' });
    }

    nguoiDung.password = newPassword;
    await nguoiDung.save();

    res.json({ success: true, msg: 'Đổi mật khẩu thành công' });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/auth/oauth – Đăng nhập / Đăng ký qua OAuth (Google, GitHub)
// ============================================================
router.post('/oauth', async (req, res, next) => {
  try {
    const { provider, providerId, name, email, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, msg: 'Không nhận được email từ nhà cung cấp' });
    }

    // Kiểm tra xem user này đã tồn tại chưa
    let nguoiDung = await User.findOne({ email });

    if (!nguoiDung) {
      // Nếu chưa có, tự động chuyển email username thành tên đăng nhập
      const baseUsername = email.split('@')[0];
      let newUsername = baseUsername;
      
      // Chống trùng username
      let exist = await User.findOne({ username: newUsername });
      if (exist) {
         newUsername = `${baseUsername}_${Date.now().toString().slice(-4)}`;
      }

      // Tạo user mới (với password ngẫu nhiên siêu dài vì họ dùng OAuth)
      nguoiDung = await User.create({
        username: newUsername,
        email,
        password: require('crypto').randomBytes(32).toString('hex'), // Mật khẩu ngẫu nhiên
        role: 'user', // Mặc định role là user
        isActive: true,
        provider: provider // Lưu lại thông tin đăng nhập bằng gì (google, github)
      });
    }

    // Nếu người dùng đã tồn tại, ta cũng có thể cập nhật lại provider đăng nhập cuối cùng (nếu muốn)
    if (nguoiDung.provider !== provider) {
      nguoiDung.provider = provider;
    }

    // Cập nhật lastLogin
    nguoiDung.lastLogin = new Date();
    await nguoiDung.save({ validateBeforeSave: false });

    // Tạo token cho user
    const token = jwt.sign({ id: nguoiDung._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      success: true,
      msg: 'Đăng nhập OAuth thành công',
      token,
      user: nguoiDung
    });
  } catch (err) {
    console.error('Lỗi OAuth Auth:', err);
    next(err);
  }
});

module.exports = router;
