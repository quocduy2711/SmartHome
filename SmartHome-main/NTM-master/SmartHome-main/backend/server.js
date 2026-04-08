require('dotenv').config({ override: true });
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const MQTTService = require('./services/mqttService');
const RuleEngine = require('./services/ruleEngine');
const errorHandler = require('./middleware/errorHandler');

// Import các route
const authRoutes   = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dataRoutes   = require('./routes/data');
const userRoutes   = require('./routes/users');
const ruleRoutes   = require('./routes/rules');

// ── Khởi tạo ứng dụng ────────────────────────────────
const app = express();
const server = http.createServer(app);

// Cấu hình Socket.io cho kết nối real-time với frontend
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// ── Middleware ────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ghi log mọi request đến server
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Kiểm tra sức khỏe hệ thống ───────────────────────
app.get('/health', (req, res) => {
  const mqttService = req.app.get('mqttService');
  res.json({
    status: 'ok',
    thoiGianHoatDong: `${Math.floor(process.uptime())} giây`,
    thoiGianHienTai: new Date(),
    mqtt: mqttService ? mqttService.getStatus() : { connected: false }
  });
});

// ── Đăng ký các route API ─────────────────────────────
app.use('/api/auth',    authRoutes);    // Đăng nhập, đăng ký
app.use('/api/devices', deviceRoutes);  // Quản lý và điều khiển thiết bị
app.use('/api/data',    dataRoutes);    // Dữ liệu cảm biến và thống kê
app.use('/api/users',   userRoutes);    // Quản lý người dùng (Admin)
app.use('/api/rules',   ruleRoutes);    // Quản lý quy tắc tự động
app.use('/api/sensors', require('./routes/sensors'));  // API dữ liệu indoor thời gian thực
app.use('/api/weather', require('./routes/weather'));  // API thời tiết outdoor

// Xử lý route không tồn tại
app.use((req, res) => {
  res.status(404).json({ success: false, msg: `Đường dẫn ${req.originalUrl} không tồn tại` });
});

// Middleware xử lý lỗi tập trung (phải đặt cuối cùng)
app.use(errorHandler);

// ── Sự kiện WebSocket (Socket.io) ────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client kết nối: ${socket.id}`);

  // Gửi trạng thái MQTT ngay khi client kết nối
  const mqttService = app.get('mqttService');
  if (mqttService) {
    socket.emit('mqttStatus', mqttService.getStatus());
  }

  // Client hỏi trạng thái MQTT
  socket.on('getMqttStatus', () => {
    const svc = app.get('mqttService');
    socket.emit('mqttStatus', svc ? svc.getStatus() : { connected: false });
  });

  // Client gửi lệnh điều khiển qua WebSocket (thay thế REST API cho độ trễ thấp)
  socket.on('controlDevice', async ({ deviceId, action, payload }) => {
    const svc = app.get('mqttService');
    if (!svc) return;
    try {
      const Device = require('./models/Device');
      const thietBi = await Device.findById(deviceId);
      if (!thietBi) return;
      svc.publishCommand(`${thietBi.mqttTopic}/command`, { action, payload, deviceId });
      console.log(`[WS] Điều khiển thiết bị qua WebSocket: ${thietBi.name} → ${action}`);
    } catch (err) {
      console.error('[WS] Lỗi điều khiển thiết bị:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client ngắt kết nối: ${socket.id}`);
  });
});

// ── Khởi động server ──────────────────────────────────
const khoiDongServer = async () => {
  try {
    // Kết nối MongoDB
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 3000
      });
      console.log('✅ Đã kết nối MongoDB');
    } catch (err) {
      console.log('⚠️ Không thể kết nối MongoDB cục bộ:', err.message);
      console.log('🔄 Đang khởi động mongodb-memory-server làm fallback...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ Đã kết nối MongoDB (In-Memory)');
    }

    // Auto-seed admin and devices
    const User = require('./models/User');
    const Device = require('./models/Device');
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({ username: 'admin', password: 'admin123', email: 'admin@smarthome.local', role: 'admin', isActive: true });
      console.log('🎉 Đã tạo seed user admin (pass: admin123) trên DB');
    }

    // Kiểm tra và seed thiết bị
    console.log('🔍 Đang kiểm tra dữ liệu thiết bị trong DB...');
    const existingSeedDevice = await Device.findOne({ name: 'Đèn 1' });
    if (!existingSeedDevice && adminUser) {
      console.log('⚙️ Chưa có thiết bị mẫu, bắt đầu thêm 6 thiết bị mặc định...');
      const seedDevices = [
        { name: 'Đèn 1', type: 'light', location: 'living_room', state: { isOn: true }, mqttTopic: 'smarthome/device/light1', status: 'online', createdBy: adminUser._id },
        { name: 'Đèn 2', type: 'light', location: 'bedroom', state: { isOn: true }, mqttTopic: 'smarthome/device/light2', status: 'online', createdBy: adminUser._id },
        { name: 'Đèn 3', type: 'light', location: 'kitchen', state: { isOn: true }, mqttTopic: 'smarthome/device/light3', status: 'online', createdBy: adminUser._id },
        { name: 'Quạt Nhỏ 1 (3V)', type: 'fan', location: 'living_room', config: { voltage: '3V' }, state: { isOn: true }, mqttTopic: 'smarthome/device/fan1', status: 'online', createdBy: adminUser._id },
        { name: 'Quạt Nhỏ 2 (3V)', type: 'fan', location: 'bedroom', config: { voltage: '3V' }, state: { isOn: true }, mqttTopic: 'smarthome/device/fan2', status: 'online', createdBy: adminUser._id },
        { name: 'Quạt Lớn (12V)', type: 'fan', location: 'living_room', config: { voltage: '12V' }, state: { isOn: true }, mqttTopic: 'smarthome/device/fan3', status: 'online', createdBy: adminUser._id }
      ];
      await Device.insertMany(seedDevices);
      console.log('🎉 Đã tạo seed 6 thiết bị (3 đèn, 3 quạt) thành công!');
    } else {
      console.log(`✅ Đã có sẵn thiết bị trong DB (VD: ${existingSeedDevice ? existingSeedDevice.name : 'Khác'}), bỏ qua tạo seed mới.`);
    }

    // Khởi tạo MQTT sau khi database sẵn sàng
    const mqttService = new MQTTService(io);
    mqttService.connect();
    app.set('mqttService', mqttService);
    app.set('io', io);

    // Khởi tạo Rule Engine
    const ruleEngine = new RuleEngine(mqttService);
    await ruleEngine.start();
    app.set('ruleEngine', ruleEngine);

    const CONG = process.env.PORT || 5000;
    server.listen(CONG, () => {
      console.log(`\n🚀 Server Nhà Thông Minh đang chạy tại http://localhost:${CONG}`);
      console.log(`📡 WebSocket đã sẵn sàng`);
      console.log(`🔗 Kiểm tra hệ thống: http://localhost:${CONG}/health`);
      console.log(`\n📋 Danh sách API:`);
      console.log(`   POST /api/auth/register        – Đăng ký`);
      console.log(`   POST /api/auth/login            – Đăng nhập`);
      console.log(`   GET  /api/auth/me               – Thông tin cá nhân`);
      console.log(`   GET  /api/devices               – Danh sách thiết bị`);
      console.log(`   POST /api/devices/:id/toggle    – Bật/Tắt thiết bị`);
      console.log(`   POST /api/devices/:id/control   – Điều khiển thiết bị`);
      console.log(`   GET  /api/data/summary          – Tổng quan dashboard`);
      console.log(`   GET  /api/data/history          – Lịch sử cảm biến`);
      console.log(`   GET  /api/data/stats            – Thống kê biểu đồ`);
      console.log(`   GET  /api/data/logs             – Lịch sử điều khiển\n`);
    });

    // Tắt server an toàn khi nhận tín hiệu SIGTERM
    process.on('SIGTERM', () => {
      console.log('\nĐang tắt server...');
      ruleEngine.stop();
      mqttService.disconnect();
      server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('❌ Lỗi khởi động server:', err.message);
    process.exit(1);
  }
};

khoiDongServer();
