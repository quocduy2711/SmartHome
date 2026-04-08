'use client';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsTab() {
  const { theme, toggleTheme } = useTheme();
  const [toast, setToast] = useState(null);

  const handleThemeToggle = () => {
    toggleTheme();
    setToast({ 
      message: theme === 'dark' ? '☀️ Chế độ sáng đã bật' : '🌙 Chế độ tối đã bật', 
      type: 'success' 
    });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>⚙️ Cài đặt hệ thống</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Quản lý cài đặt và tùy chỉnh giao diện
        </p>
      </div>

      {/* Display Settings */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          🎨 Giao diện
        </h3>

        {/* Theme Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🌓</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                Chế độ sáng / tối
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {theme === 'dark' ? 'Đang sử dụng chế độ tối' : 'Đang sử dụng chế độ sáng'}
              </div>
            </div>
          </div>

          <button
            onClick={handleThemeToggle}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={e => {
              e.target.style.background = 'var(--accent-hover)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'var(--accent)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {theme === 'dark' ? '☀️ Chế độ sáng' : '🌙 Chế độ tối'}
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
          💡 Gợi ý: Chế độ tối giúp giảm mỏi mắt khi sử dụng trong môi trường yếu ánh sáng.
        </p>
      </div>

      {/* System Info */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          ℹ️ Thông tin hệ thống
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Ứng dụng</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>NEXUS - Nhà Thông Minh</span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0'
          }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Phiên bản</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>v1.0.0</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          📚 Về ứng dụng
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          NEXUS là một hệ thống quản lý và điều khiển nhà thông minh toàn diện. 
          Với giao diện trực quan và các tính năng tự động hóa mạnh mẽ, 
          bạn có thể kiểm soát toàn bộ hệ thống nhà thông minh của mình từ bất kỳ đâu.
        </p>

        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--accent-dim)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--accent)',
          color: 'var(--text-primary)',
          fontSize: 12
        }}>
          📌 Phiên bản hiện tại được phát triển để mang lại trải nghiệm người dùng tốt nhất.
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '14px 16px',
            borderRadius: 'var(--radius)',
            background: 'rgba(34, 211, 165, 0.1)',
            border: '1px solid rgba(34, 211, 165, 0.3)',
            color: 'var(--green)',
            fontSize: '14px',
            fontWeight: 500,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideIn 0.3s ease forwards',
            zIndex: 9999
          }}
        >
          <span>✅</span>
          <span>{toast.message}</span>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
