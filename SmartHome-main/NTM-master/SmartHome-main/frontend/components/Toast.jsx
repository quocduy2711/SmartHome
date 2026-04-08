'use client';
import { useState, useEffect } from 'react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgColor = {
    success: 'background: rgba(34, 211, 165, 0.1); border-color: rgba(34, 211, 165, 0.3);',
    error: 'background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.3);',
    info: 'background: rgba(96, 165, 250, 0.1); border-color: rgba(96, 165, 250, 0.3);',
    warning: 'background: rgba(251, 146, 60, 0.1); border-color: rgba(251, 146, 60, 0.3);'
  };

  const textColor = {
    success: 'color: var(--green);',
    error: 'color: var(--red);',
    info: 'color: var(--blue);',
    warning: 'color: var(--orange);'
  };

  const icon = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        animation: 'slideIn 0.3s ease forwards'
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius)',
          border: '1px solid',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px',
          fontWeight: 500,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          ...Object.fromEntries(bgColor[type].split(';').filter(Boolean).map(s => {
            const [k, v] = s.split(':');
            return [k.trim(), v.trim()];
          })),
          ...Object.fromEntries(textColor[type].split(';').filter(Boolean).map(s => {
            const [k, v] = s.split(':');
            return [k.trim(), v.trim()];
          }))
        }}
      >
        <span style={{ fontSize: '18px' }}>{icon[type]}</span>
        <span>{message}</span>
      </div>

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
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
