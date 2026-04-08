'use client';
import { useState, useEffect } from 'react';

export default function ConfirmDialog({ 
  isOpen, 
  title = 'Xác nhận', 
  message = 'Bạn chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  isDangerous = false,
  onConfirm,
  onCancel
}) {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    setShowDialog(isOpen);
  }, [isOpen]);

  const handleConfirm = () => {
    setShowDialog(false);
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    setShowDialog(false);
    if (onCancel) onCancel();
  };

  if (!showDialog) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={handleCancel}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--glass-border)',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          zIndex: 9999,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease forwards'
        }}
      >
        {/* Title */}
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          {title}
        </h2>

        {/* Message */}
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          lineHeight: 1.6
        }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--glass-border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              hover: {
                background: 'var(--glass-hover)'
              }
            }}
            onMouseEnter={e => e.target.style.background = 'var(--glass-hover)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: isDangerous ? 'var(--red)' : 'var(--accent)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.target.style.opacity = '0.85'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, -40%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
