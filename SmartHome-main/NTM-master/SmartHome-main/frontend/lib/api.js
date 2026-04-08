import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_URL });

// Tự động gắn token từ NextAuth session vào mọi request
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers['x-auth-token'] = session.accessToken;
  }
  return config;
});

// Xử lý lỗi toàn cục 401 thì logout NextAuth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') signOut({ callbackUrl: '/login' });
    }
    return Promise.reject(err);
  }
);

export const dangNhap    = (data) => api.post('/api/auth/login', data);
export const dangKy      = (data) => api.post('/api/auth/register', data);
export const layThongTin = ()     => api.get('/api/auth/me');

export const layDanhSachThietBi = (filter = {}) => api.get('/api/devices', { params: filter });
export const layThietBiTheoId   = (id)           => api.get(`/api/devices/${id}`);
export const themThietBi        = (data)          => api.post('/api/devices', data);
export const capNhatThietBi     = (id, data)      => api.put(`/api/devices/${id}`, data);
export const xoaThietBi         = (id)            => api.delete(`/api/devices/${id}`);
export const batTatThietBi      = (id)            => api.post(`/api/devices/${id}/toggle`);
export const dieuKhienThietBi   = (id, data)      => api.post(`/api/devices/${id}/control`, data);
export const lichSuThietBi      = (id, params)    => api.get(`/api/devices/${id}/history`, { params });
export const lichSuLenhThietBi  = (id)            => api.get(`/api/devices/${id}/logs`);
export const layLichSuHoatDong = (params) => api.get('/api/devices/logs', { params });

export const tongQuan      = ()           => api.get('/api/data/summary');
export const lichSuCamBien = (params) => api.get('/api/data/history', { params });
export const thongKeBieuDo = (params) => api.get('/api/data/stats',   { params });
export const lichSuLenh    = (params) => api.get('/api/data/logs',    { params });

// Rules
export const layDanhSachRules = () => api.get('/api/rules');
export const taoRule = (data) => api.post('/api/rules', data);
export const capNhatRule = (id, data) => api.put(`/api/rules/${id}`, data);
export const xoaRule = (id) => api.delete(`/api/rules/${id}`);
export const toggleRule = (id) => api.patch(`/api/rules/${id}/toggle`);

// Theme
export const capNhatTheme = (theme) => api.patch('/api/users/theme', { theme });

export const kiemTraHeThong = () => api.get('/health');

export default api;
