'use client';
import { useState, useEffect, useCallback } from 'react';
import { layDanhSachRules, taoRule, capNhatRule, xoaRule, toggleRule, layDanhSachThietBi } from '@/lib/api';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

export default function RulesTab() {
  const [rules, setRules] = useState([]);
  const [thietBis, setThietBis] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [hienForm, setHienForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    enabled: true,
    triggerType: 'time',
    time: '08:00',
    days: [],
    sensorCondition: '>',
    sensorValue: 25,
    sensorType: 'temperature',
    faceCondition: 'detected',
    deviceId: '',
    action: 'on'
  });

  const daysLabel = { 'CN': 'Chủ nhật', 'T2': 'Thứ 2', 'T3': 'Thứ 3', 'T4': 'Thứ 4', 'T5': 'Thứ 5', 'T6': 'Thứ 6', 'T7': 'Thứ 7' };
  const daysOptions = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const fetchRules = useCallback(async () => {
    try {
      setDangTai(true);
      const res = await layDanhSachRules();
      setRules(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải rules:', err.message);
      setToast({ message: 'Lỗi tải danh sách quy tắc', type: 'error' });
    } finally {
      setDangTai(false);
    }
  }, []);

  const fetchThietBis = useCallback(async () => {
    try {
      const res = await layDanhSachThietBi();
      setThietBis(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải thiết bị:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchThietBis();
  }, [fetchRules, fetchThietBis]);

  const resetForm = () => {
    setForm({
      name: '',
      enabled: true,
      triggerType: 'time',
      time: '08:00',
      days: [],
      sensorCondition: '>',
      sensorValue: 25,
      sensorType: 'temperature',
      faceCondition: 'detected',
      deviceId: '',
      action: 'on'
    });
    setEditingRule(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      setToast({ message: 'Vui lòng nhập tên quy tắc', type: 'warning' });
      return;
    }
    if (!form.deviceId) {
      setToast({ message: 'Vui lòng chọn thiết bị', type: 'warning' });
      return;
    }
    if (form.triggerType === 'time' && form.days.length === 0) {
      setToast({ message: 'Vui lòng chọn ít nhất một ngày', type: 'warning' });
      return;
    }

    try {
      setDangTai(true);
      if (editingRule) {
        await capNhatRule(editingRule._id, form);
        setToast({ message: '✏️ Cập nhật quy tắc thành công', type: 'success' });
      } else {
        await taoRule(form);
        setToast({ message: '➕ Tạo quy tắc thành công', type: 'success' });
      }
      fetchRules();
      setHienForm(false);
      resetForm();
    } catch (err) {
      setToast({ message: 'Lỗi: ' + (err.response?.data?.msg || err.message), type: 'error' });
    } finally {
      setDangTai(false);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      enabled: rule.enabled,
      triggerType: rule.triggerType,
      time: rule.time || '08:00',
      days: rule.days || [],
      sensorCondition: rule.sensorCondition || '>',
      sensorValue: rule.sensorValue || 25,
      sensorType: rule.sensorType || 'temperature',
      faceCondition: rule.faceCondition || 'detected',
      deviceId: rule.deviceId?._id || '',
      action: rule.action
    });
    setHienForm(true);
  };

  const handleDelete = (ruleId) => {
    setDeleteRuleId(ruleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteRuleId) return;
    
    try {
      await xoaRule(deleteRuleId);
      setToast({ message: '🗑️ Xóa quy tắc thành công', type: 'success' });
      fetchRules();
    } catch (err) {
      setToast({ message: 'Lỗi: ' + (err.response?.data?.msg || err.message), type: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteRuleId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteRuleId(null);
  };

  const handleToggle = async (ruleId) => {
    try {
      const res = await toggleRule(ruleId);
      const newState = res.data.data?.enabled;
      setToast({ message: newState ? '✅ Bật quy tắc thành công' : '⭕ Tắt quy tắc thành công', type: 'success' });
      fetchRules();
    } catch (err) {
      setToast({ message: 'Lỗi: ' + (err.response?.data?.msg || err.message), type: 'error' });
    }
  };

  const getDeviceName = (deviceId) => {
    if (!deviceId) return '?';
    const device = thietBis.find(t => t._id === (typeof deviceId === 'object' ? deviceId._id : deviceId));
    return device ? device.name : '?';
  };

  const getRulePreview = (rule) => {
    let trigger = '';
    if (rule.triggerType === 'time') {
      const days = (rule.days || []).map(d => daysLabel[d]).join(', ');
      trigger = `Lúc ${rule.time} vào ${days}`;
    } else if (rule.triggerType === 'sensor') {
      trigger = `Khi ${rule.sensorType} ${rule.sensorCondition} ${rule.sensorValue}`;
    } else if (rule.triggerType === 'face') {
      trigger = `Khi phát hiện khuôn mặt ${rule.faceCondition === 'detected' ? '✓' : '✗'}`;
    }
    
    const deviceName = typeof rule.deviceId === 'object' ? rule.deviceId.name : getDeviceName(rule.deviceId);
    const action = { on: 'Bật', off: 'Tắt', toggle: 'Đóng/Mở' }[rule.action] || rule.action;
    return `${trigger} → ${deviceName} (${action})`;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>⚡ Tự động hóa</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {rules.length} quy tắc · {rules.filter(r => r.enabled).length} đang bật
        </p>
      </div>

      {/* Add Button */}
      <button
        onClick={() => { resetForm(); setHienForm(true); }}
        style={{
          padding: '10px 16px',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 13,
          transition: 'background 0.2s',
          alignSelf: 'flex-start'
        }}
        onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
        onMouseLeave={(e) => e.target.style.background = 'var(--accent)'}
      >
        + Thêm Quy Tắc
      </button>

      {/* Form */}
      {hienForm && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            {editingRule ? '✏️ Sửa Quy Tắc' : '➕ Tạo Quy Tắc Mới'}
          </h3>
          
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tên Quy Tắc *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Bật đèn buổi sáng"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Trigger Type */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Kiểu Kích Hoạt *</label>
              <select
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="time">⏰ Thời gian cố định</option>
                <option value="sensor">📊 Cảm biến</option>
                <option value="face">😊 Phát hiện khuôn mặt</option>
              </select>
            </div>

            {/* Time-based */}
            {form.triggerType === 'time' && (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Giờ *</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Ngày *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {daysOptions.map((day) => (
                      <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={form.days.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, days: [...form.days, day] });
                            } else {
                              setForm({ ...form, days: form.days.filter(d => d !== day) });
                            }
                          }}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                        <span>{daysLabel[day]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Sensor-based */}
            {form.triggerType === 'sensor' && (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Loại Cảm Biến *</label>
                  <select
                    value={form.sensorType}
                    onChange={(e) => setForm({ ...form, sensorType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="temperature">🌡️ Nhiệt độ</option>
                    <option value="humidity">💧 Độ ẩm</option>
                    <option value="light">☀️ Ánh sáng</option>
                    <option value="motion">🚶 Chuyển động</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Điều Kiện *</label>
                    <select
                      value={form.sensorCondition}
                      onChange={(e) => setForm({ ...form, sensorCondition: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    >
                      <option value=">">Lớn hơn (&gt;)</option>
                      <option value="<">Nhỏ hơn (&lt;)</option>
                      <option value=">=">&gt;= Lớn hơn hoặc bằng</option>
                      <option value="<=">&lt;= Nhỏ hơn hoặc bằng</option>
                      <option value="==">Bằng (==)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Giá Trị *</label>
                    <input
                      type="number"
                      value={form.sensorValue}
                      onChange={(e) => setForm({ ...form, sensorValue: parseFloat(e.target.value) || 0 })}
                      placeholder="VD: 25"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Face-based */}
            {form.triggerType === 'face' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Điều Kiện *</label>
                <select
                  value={form.faceCondition}
                  onChange={(e) => setForm({ ...form, faceCondition: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="detected">✅ Phát hiện được</option>
                  <option value="not_detected">❌ Không phát hiện</option>
                </select>
              </div>
            )}

            {/* Device & Action */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Thiết Bị *</label>
                <select
                  value={form.deviceId}
                  onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {thietBis.map(tb => (
                    <option key={tb._id} value={tb._id}>{tb.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hành Động *</label>
                <select
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="on">🟢 Bật</option>
                  <option value="off">🔴 Tắt</option>
                  <option value="toggle">🔁 Đóng/Mở</option>
                </select>
              </div>
            </div>

            {/* Enabled */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <span>Kích hoạt quy tắc này</span>
            </label>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="submit"
                disabled={dangTai}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: dangTai ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  opacity: dangTai ? 0.7 : 1
                }}
              >
                {editingRule ? '💾 Cập nhật' : '➕ Tạo'}
              </button>
              <button
                type="button"
                onClick={() => { setHienForm(false); resetForm(); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                ✕ Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rules.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có quy tắc nào. Tạo quy tắc đầu tiên để bắt đầu tự động hóa!
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule._id}
              className="glass-card"
              style={{
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: rule.enabled ? 1 : 0.6
              }}
            >
              {/* Status Button */}
              <button
                onClick={() => handleToggle(rule._id)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: '2px solid ' + (rule.enabled ? 'var(--accent)' : 'var(--glass-border)'),
                  background: rule.enabled ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: rule.enabled ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                title={rule.enabled ? 'Tắt quy tắc' : 'Bật quy tắc'}
              >
                {rule.enabled ? '✓' : '○'}
              </button>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{rule.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {getRulePreview(rule)}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleEdit(rule)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--glass)';
                    e.target.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'var(--text-secondary)';
                  }}
                >
                  ✏️ Sửa
                </button>
                <button
                  onClick={() => handleDelete(rule._id)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    color: 'var(--red)',
                    border: '1px solid var(--red-dim)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--red-dim)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast Notification */}
      <Toast 
        message={toast?.message} 
        type={toast?.type || 'success'} 
        onClose={() => setToast(null)} 
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Xóa quy tắc"
        message="Bạn chắc chắn muốn xóa quy tắc này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
