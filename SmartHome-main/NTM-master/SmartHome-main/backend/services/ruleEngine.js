const Rule = require('../models/Rule');

class RuleEngine {
  constructor(mqttService) {
    this.mqttService = mqttService;
    this.isRunning = false;
    this.timers = {}; // Store interval IDs for cleanup
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[RuleEngine] ✅ Bắt đầu Rule Engine');
    
    // Khởi tạo time-based rules
    this.startTimeBasedRules();
    
    // Khởi tạo sensor-based và face-based listeners
    this.startSensorListeners();
    this.startFaceListeners();
  }

  async stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    // Clear all timers
    Object.values(this.timers).forEach(timerId => clearInterval(timerId));
    this.timers = {};
    
    console.log('[RuleEngine] ✅ Dừng Rule Engine');
  }

  // ─── TIME-BASED RULES ────────────────────────────────────────────
  startTimeBasedRules() {
    // Kiểm tra time-based rules mỗi phút
    const timerId = setInterval(() => {
      this.checkTimeBasedRules();
    }, 60000); // 1 phút
    
    this.timers.timeBasedRules = timerId;
    
    // Kiểm tra ngay khi khởi động
    this.checkTimeBasedRules();
  }

  async checkTimeBasedRules() {
    try {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${h}:${m}`;
      
      // Lấy ngày hôm nay: 'CN' (0), 'T2' (1), 'T3' (2), 'T4' (3), 'T5' (4), 'T6' (5), 'T7' (6)
      const dayOfWeek = now.getDay();
      const dayMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const today = dayMap[dayOfWeek];
      
      // Tìm các rule time-based đã kích hoạt
      const rules = await Rule.find({
        triggerType: 'time',
        enabled: true,
        time: currentTime,
        days: today
      }).populate('deviceId');
      
      for (const rule of rules) {
        if (rule.deviceId) {
          await this.executeRuleAction(rule);
        }
      }
    } catch (err) {
      console.error('[RuleEngine] Lỗi kiểm tra time-based rules:', err.message);
    }
  }

  // ─── SENSOR-BASED RULES ──────────────────────────────────────────
  startSensorListeners() {
    if (!this.mqttService) return;
    
    // Subscribe tới sensor topic
    const client = this.mqttService.client;
    if (!client) return;
    
    // Lắng nghe topic cảm biến
    client.on('message', async (topic, message) => {
      if (topic.includes('sensor/')) {
        await this.checkSensorBasedRules(topic, message);
      }
    });
  }

  async checkSensorBasedRules(topic, message) {
    try {
      let value;
      try {
        const payload = JSON.parse(message.toString());
        value = payload.value || payload.giatri;
      } catch {
        value = Number(message.toString());
      }
      
      if (isNaN(value)) return;
      
      // Xác định loại cảm biến từ topic
      let sensorType = null;
      if (topic.includes('temperature')) sensorType = 'temperature';
      else if (topic.includes('humidity')) sensorType = 'humidity';
      else if (topic.includes('light')) sensorType = 'light';
      else if (topic.includes('motion')) sensorType = 'motion';
      
      if (!sensorType) return;
      
      // Tìm các rule sensor-based 
      const rules = await Rule.find({
        triggerType: 'sensor',
        enabled: true,
        sensorType: sensorType
      }).populate('deviceId');
      
      for (const rule of rules) {
        if (this.evaluateSensorCondition(value, rule.sensorCondition, rule.sensorValue)) {
          await this.executeRuleAction(rule);
        }
      }
    } catch (err) {
      console.error('[RuleEngine] Lỗi kiểm tra sensor-based rules:', err.message);
    }
  }

  evaluateSensorCondition(value, condition, threshold) {
    switch (condition) {
      case '>':  return value > threshold;
      case '<':  return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      default:   return false;
    }
  }

  // ─── FACE-BASED RULES ────────────────────────────────────────────
  startFaceListeners() {
    if (!this.mqttService) return;
    
    const client = this.mqttService.client;
    if (!client) return;
    
    // Lắng nghe topic camera/face
    client.on('message', async (topic, message) => {
      if (topic.includes('face') || topic.includes('camera')) {
        await this.checkFaceBasedRules(topic, message);
      }
    });
  }

  async checkFaceBasedRules(topic, message) {
    try {
      let eventType = 'not_detected';
      
      try {
        const payload = JSON.parse(message.toString());
        if (payload.loaiSuKien === 'face_detected' || payload.event === 'face_detected') {
          eventType = 'detected';
        }
      } catch {
        const msg = message.toString().toLowerCase();
        if (msg.includes('face') || msg.includes('detected')) {
          eventType = 'detected';
        }
      }
      
      // Tìm các rule face-based 
      const rules = await Rule.find({
        triggerType: 'face',
        enabled: true,
        faceCondition: eventType
      }).populate('deviceId');
      
      for (const rule of rules) {
        await this.executeRuleAction(rule);
      }
    } catch (err) {
      console.error('[RuleEngine] Lỗi kiểm tra face-based rules:', err.message);
    }
  }

  // ─── EXECUTE ACTION ──────────────────────────────────────────────
  async executeRuleAction(rule) {
    try {
      if (!rule.deviceId || !this.mqttService) return;
      
      const device = rule.deviceId;
      const action = rule.action; // 'on', 'off', 'toggle'
      
      // Prepare MQTT payload
      const payload = {
        action: action,
        deviceId: device._id.toString(),
        triggeredBy: 'rule',
        ruleId: rule._id.toString(),
        timestamp: new Date().toISOString()
      };
      
      // Publish command tới MQTT topic của thiết bị
      const commandTopic = `devices/${device._id}/command`;
      this.mqttService.publishCommand(commandTopic, payload);
      
      console.log(`[RuleEngine] ✅ Thực thi rule "${rule.name}" → Thiết bị "${device.name}" (${action})`);
    } catch (err) {
      console.error('[RuleEngine] Lỗi thực thi action:', err.message);
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      message: this.isRunning ? 'RuleEngine đang hoạt động' : 'RuleEngine đã dừng'
    };
  }
}

module.exports = RuleEngine;
