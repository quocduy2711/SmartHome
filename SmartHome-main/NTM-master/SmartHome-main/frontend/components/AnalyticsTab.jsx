'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '@/lib/api'; // Custom axios instance if available. Wait, lib/api has functions usually. Let's use fetch.

const MAX_HISTORY = 288; // 24h * 12 points/hour

export default function AnalyticsTab() {
  const [indoorHistory, setIndoorHistory] = useState([]);
  const [outdoorHistory, setOutdoorHistory] = useState([]);
  const [indoorTemp, setIndoorTemp] = useState(null);
  const [indoorHum, setIndoorHum] = useState(null);
  const [outdoorTemp, setOutdoorTemp] = useState(null);
  const [outdoorFeels, setOutdoorFeels] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedIndoor = localStorage.getItem('nexus_indoor_history');
      if (savedIndoor) setIndoorHistory(JSON.parse(savedIndoor));
      
      const savedOutdoor = localStorage.getItem('nexus_outdoor_history');
      if (savedOutdoor) setOutdoorHistory(JSON.parse(savedOutdoor));
    } catch (e) {
      console.warn("Lỗi đọc lịch sử từ localStorage:", e);
    }
  }, []);

  // Fetch hourly forecast for background data
  const fetchOutdoorForecast = async () => {
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=10.8278&longitude=106.6667&hourly=temperature_2m&timezone=Asia/Ho_Chi_Minh&forecast_days=1");
      if (res.ok) {
        const data = await res.json();
        const nowStr = new Date().toISOString();
        
        const history = data.hourly.time
          .map((time, i) => ({
            time, // ISO string for easy sorting
            temp: data.hourly.temperature_2m[i]
          }))
          .filter(item => item.time <= nowStr); // Chỉ lấy từ 00:00 đến hiện tại

        setOutdoorHistory(prev => {
          // Merge with current history, avoiding duplicates by time
          const merged = [...prev];
          history.forEach(h => {
            if (!merged.find(m => m.time === h.time)) {
              merged.push(h);
            }
          });
          const sorted = merged.sort((a, b) => new Date(a.time) - new Date(b.time));
          localStorage.setItem('nexus_outdoor_history', JSON.stringify(sorted));
          return sorted;
        });
      }
    } catch (err) {
      console.error("Lỗi lấy forecast ngoài trời:", err);
    }
  };

  // Fetch current outdoor data and append to history
  const fetchCurrentOutdoor = async () => {
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=10.8278&longitude=106.6667&current=temperature_2m,apparent_temperature&timezone=Asia/Ho_Chi_Minh");
      if (res.ok) {
        const data = await res.json();
        const outTemp = data.current.temperature_2m;
        setOutdoorTemp(outTemp);
        setOutdoorFeels(data.current.apparent_temperature);

        const newPoint = {
          time: new Date().toISOString(),
          temp: outTemp
        };

        setOutdoorHistory(prev => {
          const next = [...prev, newPoint].sort((a, b) => new Date(a.time) - new Date(b.time));
          // Limit history to ~24h (approx 144 points if 10m intervals + 24 hourly points)
          const sliced = next.length > 200 ? next.slice(next.length - 200) : next;
          localStorage.setItem('nexus_outdoor_history', JSON.stringify(sliced));
          return sliced;
        });
      }
    } catch (err) {
      console.error("Lỗi lấy thời tiết ngoài trời hiện tại:", err);
    }
  };

  const fetchIndoorData = async () => {
    try {
      const indoorRes = await api_get('/api/sensors/temperature');
      const inTemp = indoorRes?.data?.temperature ?? null;
      const inHum = indoorRes?.data?.humidity ?? null;

      setIndoorTemp(inTemp);
      setIndoorHum(inHum);
      setLastUpdated(new Date());

      if (inTemp !== null) {
        setIndoorHistory(prev => {
          const newPoint = {
            time: new Date().toISOString(),
            temp: inTemp
          };
          const next = [...prev, newPoint].slice(-MAX_HISTORY);
          localStorage.setItem('nexus_indoor_history', JSON.stringify(next));
          return next;
        });
      }
    } catch (error) {
      console.error("Lỗi cập nhật dữ liệu nhiệt độ trong nhà:", error);
    }
  };

  const api_get = async (path) => {
    const token = localStorage.getItem('token');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const res = await fetch(`${backendUrl}${path}`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    return res.json();
  };

  useEffect(() => {
    fetchOutdoorForecast();
    fetchCurrentOutdoor();
    fetchIndoorData();

    const indoorInterval = setInterval(fetchIndoorData, 30000);
    const outdoorInterval = setInterval(fetchCurrentOutdoor, 600000); // 10 mins

    return () => {
      clearInterval(indoorInterval);
      clearInterval(outdoorInterval);
    };
  }, []);


  // Merge and sort data for the chart
  const mergedData = (() => {
    const timeMap = {};
    
    indoorHistory.forEach(h => {
      const t = h.time;
      if (!timeMap[t]) timeMap[t] = { time: t };
      timeMap[t].indoor = h.temp;
    });
    
    outdoorHistory.forEach(h => {
      const t = h.time;
      if (!timeMap[t]) timeMap[t] = { time: t };
      timeMap[t].outdoor = h.temp;
    });

    return Object.values(timeMap)
      .sort((a, b) => new Date(a.time) - new Date(b.time))
      .map(d => ({
        ...d,
        displayTime: new Date(d.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }));
  })();

  return (
    <div className="analytics-container fade-in">
      <div className="stats-header">
        {/* Trong nhà */}
        <div className="stat-card indoor">
          <div className="stat-title">Trong nhà · DHT11</div>
          <div className="stat-main">
            <span className="stat-temp">{indoorTemp != null ? Number(indoorTemp).toFixed(1) : '--'}°C</span>
            <span className="stat-sub">💧 {indoorHum != null ? Number(indoorHum).toFixed(1) : '--'}%</span>
          </div>
        </div>

        {/* Ngoài trời */}
        <div className="stat-card outdoor">
          <div className="stat-title">Ngoài trời · Gò Vấp</div>
          <div className="stat-main">
            <span className="stat-temp">{outdoorTemp != null ? Number(outdoorTemp).toFixed(1) : '--'}°C</span>
            <span className="stat-sub">Cảm giác: {outdoorFeels != null ? Number(outdoorFeels).toFixed(1) : '--'}°C</span>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        <h3 className="chart-title">Biểu đồ nhiệt độ 24H</h3>
        <div className="chart-inner">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="displayTime"
                stroke="var(--text-muted)"
                tick={{ fontSize: 11 }}
                tickMargin={10}
                minTickGap={30}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="var(--text-muted)"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 17, 23, 0.95)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
                itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                labelStyle={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <Line
                name="Trong nhà (°C)"
                type="monotone"
                dataKey="indoor"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={false}
                connectNulls={true}
                activeDot={{ r: 6, fill: '#60a5fa', stroke: '#181d27', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                name="Ngoài trời (°C)"
                type="monotone"
                dataKey="outdoor"
                stroke="#fb923c"
                strokeWidth={3}
                strokeDasharray="6 6"
                dot={false}
                connectNulls={true}
                activeDot={{ r: 6, fill: '#fb923c', stroke: '#181d27', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="last-updated">
        Cập nhật lúc: {lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN') : '--:--:--'}
      </div>

      <style jsx>{`
        .analytics-container {
          background: #181d27;
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          height: 100%;
        }

        .stats-header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .stat-card {
          background: var(--bg-primary);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stat-card.indoor { border-top: 3px solid #60a5fa; }
        .stat-card.outdoor { border-top: 3px solid #fb923c; }

        .stat-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-main {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .stat-temp {
          font-size: 28px;
          font-weight: 800;
        }

        .indoor .stat-temp { color: #60a5fa; }
        .outdoor .stat-temp { color: #fb923c; }

        .stat-sub {
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .chart-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 250px;
        }

        .chart-title {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 600;
        }

        .chart-inner {
          flex: 1;
        }

        .last-updated {
          text-align: right;
          font-size: 11px;
          color: var(--text-muted);
        }

        @media (max-width: 600px) {
          .stats-header { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
