'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { layLichSuHoatDong } from '@/lib/api';

export default function ActivityLogTable() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (isLoadMore = false) => {
    try {
      const currentSkip = isLoadMore ? skip + 20 : 0;
      const res = await layLichSuHoatDong({ limit: 20, skip: currentSkip });
      const newLogs = res.data.data;
      
      if (isLoadMore) {
        setLogs(prev => [...prev, ...newLogs]);
        setSkip(currentSkip);
      } else {
        setLogs(newLogs);
        setSkip(0);
      }
      
      if (newLogs.length < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử hoạt động:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const sckt = getSocket();
    sckt.on('deviceStateChanged', (data) => {
      // Re-fetch or manually prepend
      // To match the requirement "log mới tự động xuất hiện trên đầu bảng"
      // We can construct the log from data if it matches the schema
      if (data.action === 'turn_on' || data.action === 'turn_off') {
        const newLog = {
          _id: Date.now().toString(),
          deviceName: data.name,
          deviceId: data.deviceId,
          action: data.action === 'turn_on' ? 'on' : 'off',
          room: data.location || 'Chưa xác định',
          timestamp: data.timestamp || new Date()
        };
        setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep it manageable
      }
    });

    return () => {
      sckt.off('deviceStateChanged');
    };
  }, []);

  const formatTime = (timeStr) => {
    const d = new Date(timeStr);
    const hms = d.toLocaleTimeString('vi-VN', { hour12: false });
    const dmy = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return `${hms} - ${dmy}`;
  };

  return (
    <div className="activity-section fade-in">
      <div className="section-title">📜 Lịch sử hoạt động</div>
      <div className="glass-card activity-card">
        <div className="table-responsive">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Thiết bị</th>
                <th>Phòng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="time-col">{formatTime(log.timestamp)}</td>
                  <td className="device-col">{log.deviceName}</td>
                  <td className="room-col">{log.room}</td>
                  <td className="action-col">
                    <span className={`badge ${log.action}`}>
                      {log.action === 'on' ? 'BẬT' : 'TẮT'}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="empty-msg">Chưa có hoạt động nào được ghi lại.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {hasMore && (
          <div className="load-more-wrap">
            <button 
              className="load-more-btn" 
              onClick={() => fetchLogs(true)}
              disabled={loading}
            >
              {loading ? 'Đang tải...' : 'Xem thêm'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .activity-section {
          margin-top: 24px;
          margin-bottom: 24px;
        }
        .activity-card {
          padding: 0;
          overflow: hidden;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .activity-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .activity-table th {
          text-align: left;
          padding: 12px 16px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.02);
        }
        .activity-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--glass-border);
          color: var(--text-primary);
        }
        .activity-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .time-col {
          color: var(--text-secondary);
          white-space: nowrap;
          width: 180px;
        }
        .device-col {
          font-weight: 500;
        }
        .room-col {
          color: var(--text-muted);
        }
        .action-col {
          width: 80px;
          text-align: center;
        }
        .badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          display: inline-block;
        }
        .badge.on {
          background: rgba(34, 197, 94, 0.1);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .badge.off {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .empty-msg {
          text-align: center;
          padding: 40px !important;
          color: var(--text-muted);
        }
        .load-more-wrap {
          padding: 16px;
          text-align: center;
          border-top: 1px solid var(--glass-border);
        }
        .load-more-btn {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          padding: 8px 24px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .load-more-btn:hover:not(:disabled) {
          background: var(--glass-border);
          color: var(--text-primary);
        }
        .load-more-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
