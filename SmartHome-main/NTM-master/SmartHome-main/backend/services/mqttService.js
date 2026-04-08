const mqtt = require('mqtt');
const Device = require('../models/Device');
const SensorData = require('../models/SensorData');

class MQTTService {
  constructor(io) {
    this.io = io;       // Socket.io để đẩy dữ liệu real-time lên frontend
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    const brokerUrl = process.env.MQTT_BROKER_URL;
    console.log(`[MQTT] Đang kết nối tới broker: ${brokerUrl}...`);

    this.client = mqtt.connect(brokerUrl, {
      clientId: `smart_home_backend_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 3000,
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('✅ [MQTT] Đã kết nối tới Broker');

      // Đăng ký nhận tin nhắn từ tất cả các topic của hệ thống nhà thông minh
      const danhSachTopic = [
        'smarthome/sensor/+',       // Cảm biến: nhiệt độ, độ ẩm, khí gas...
        'smarthome/camera/+',       // Camera AI: nhận diện khuôn mặt, phát hiện chuyển động
        'smarthome/device/+/state', // Thiết bị báo trạng thái thực (đèn/quạt đang bật/tắt)
        'smarthome/status/+'        // Heartbeat / ping từ thiết bị
      ];

      danhSachTopic.forEach(topic => {
        this.client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) console.error(`[MQTT] ✗ Đăng ký thất bại: ${topic}`, err.message);
          else     console.log(`[MQTT] ✓ Đã đăng ký: ${topic}`);
        });
      });

      // Thông báo trạng thái kết nối lên frontend qua WebSocket
      this.io.emit('mqttStatus', { connected: true });
    });

    this.client.on('message', async (topic, message) => {
      try {
        const rawMsg = message.toString().trim();
        let payload;
        try {
          payload = JSON.parse(rawMsg);
        } catch {
          // Giá trị đơn giản không phải JSON (ví dụ: "25.4" hoặc "ON")
          payload = { value: isNaN(rawMsg) ? rawMsg : Number(rawMsg) };
        }
        console.log(`[MQTT] ← Nhận: ${topic}:`, payload);
        await this.xulayTinNhan(topic, payload);
      } catch (error) {
        console.error('[MQTT] Lỗi xử lý tin nhắn:', error.message);
      }
    });

    this.client.on('error', (err) => {
      console.error('[MQTT] ✗ Lỗi kết nối:', err.message);
      this.isConnected = false;
      this.io.emit('mqttStatus', { connected: false, error: err.message });
    });

    this.client.on('reconnect', () => {
      console.log('[MQTT] Đang thử kết nối lại...');
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('[MQTT] Đã ngắt kết nối');
      this.isConnected = false;
    });
  }

  /**
   * Phân loại và xử lý tin nhắn MQTT theo cấu trúc topic:
   *   smarthome/sensor/<loaiCamBien>       → nhiệt độ, độ ẩm, chuyển động...
   *   smarthome/camera/<suKien>            → nhận diện khuôn mặt, cảnh báo...
   *   smarthome/device/<id>/state          → thiết bị báo trạng thái thực
   *   smarthome/status/<id>                → heartbeat
   */
  async xulayTinNhan(topic, payload) {
    const phan = topic.split('/');
    if (phan.length < 3) return;

    const nhom = phan[1]; // sensor | camera | device | status

    // Thiết bị báo trạng thái: smarthome/device/<id>/state
    if (nhom === 'device' && phan[3] === 'state') {
      await this.xulyTrangThaiThietBi(phan[2], payload);
      return;
    }

    // Heartbeat: smarthome/status/<id>
    if (nhom === 'status') {
      await this.xulyHeartbeat(phan[2], payload);
      return;
    }

    // Cảm biến hoặc camera: smarthome/sensor/<loai> hoặc smarthome/camera/<suKien>
    const loaiDuLieu = phan[2];
    await this.xulyDuLieuCamBienCamera(nhom, loaiDuLieu, payload);
  }

  /**
   * Xử lý khi thiết bị (đèn, quạt...) tự báo trạng thái thực của nó
   * Topic: smarthome/device/<deviceId>/state
   * Payload ví dụ: { "isOn": true, "speed": 2 }
   */
  async xulyTrangThaiThietBi(deviceId, payload) {
    try {
      const thietBi = await Device.findByIdAndUpdate(
        deviceId,
        { $set: { state: payload, lastSeen: new Date(), status: 'online' } },
        { new: true }
      );

      if (!thietBi) return;

      // Đẩy trạng thái mới lên tất cả client web – giao diện tự cập nhật
      this.io.emit('deviceStateChanged', {
        deviceId: thietBi._id,
        name: thietBi.name,
        type: thietBi.type,
        location: thietBi.location,
        state: thietBi.state,
        timestamp: new Date()
      });

      console.log(`[MQTT] Đồng bộ trạng thái: ${thietBi.name} →`, thietBi.state);
    } catch (err) {
      console.error('[MQTT] Lỗi đồng bộ trạng thái thiết bị:', err.message);
    }
  }

  /**
   * Xử lý heartbeat từ thiết bị
   * Topic: smarthome/status/<deviceId>
   */
  async xulyHeartbeat(deviceId, payload) {
    try {
      await Device.findByIdAndUpdate(deviceId, {
        $set: { lastSeen: new Date(), status: 'online' }
      });
    } catch (err) {
      console.error('[MQTT] Lỗi xử lý heartbeat:', err.message);
    }
  }

  /**
   * Xử lý dữ liệu từ cảm biến và camera AI
   * Topic: smarthome/sensor/<loai>  hoặc  smarthome/camera/<suKien>
   * Payload BẮT BUỘC có: { deviceId, value, ... }
   */
  async xulyDuLieuCamBienCamera(nhom, loaiDuLieu, payload) {
    const { deviceId, value, metadata, unit } = payload;

    if (!deviceId) {
      // Không có deviceId – chỉ chuyển tiếp lên frontend để hiển thị
      this.io.emit('rawMqttMessage', { nhom, loaiDuLieu, payload, timestamp: new Date() });
      return;
    }

    try {
      // Cập nhật trạng thái mới nhất của thiết bị trong database
      await Device.findByIdAndUpdate(deviceId, {
        $set: {
          'state.currentValue': value,
          lastSeen: new Date(),
          status: 'online'
        }
      });

      // Lưu vào lịch sử dữ liệu cảm biến
      if (value !== undefined) {
        await SensorData.create({
          deviceId,
          type: loaiDuLieu,
          value,
          unit: unit || null,
          timestamp: new Date(),
          metadata: metadata || null
        });
      }

      // Đẩy dữ liệu real-time lên dashboard
      if (nhom === 'camera') {
        // Sự kiện camera AI (nhận diện khuôn mặt, phát hiện chuyển động)
        this.io.emit('cameraEvent', {
          deviceId,
          loaiSuKien: loaiDuLieu, // face_detected | motion_alert
          value,
          metadata, // Ví dụ: { confidence: 0.97, tenNguoi: 'Nguyen Van A' }
          timestamp: new Date()
        });
      } else {
        // Dữ liệu cảm biến thông thường (nhiệt độ, độ ẩm...)
        this.io.emit('sensorUpdate', {
          deviceId,
          loaiCamBien: loaiDuLieu,
          value,
          unit,
          metadata,
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error('[MQTT] Lỗi lưu dữ liệu cảm biến/camera:', err.message);
    }
  }

  /**
   * Gửi lệnh điều khiển tới thiết bị qua MQTT
   * Ví dụ tắt đèn phòng khách:
   *   publishCommand('smarthome/device/abc123/command', { action: 'turn_off', payload: { isOn: false } })
   */
  publishCommand(topic, payload) {
    if (!this.client || !this.isConnected) {
      console.warn('[MQTT] Không thể gửi lệnh – chưa kết nối broker');
      return false;
    }
    this.client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false });
    console.log(`[MQTT] → Gửi lệnh: ${topic}:`, payload);
    return true;
  }

  // Ngắt kết nối khỏi MQTT broker
  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('[MQTT] Đã ngắt kết nối khỏi broker');
    }
  }

  // Trả về trạng thái kết nối hiện tại
  getStatus() {
    return { connected: this.isConnected };
  }
}

module.exports = MQTTService;
