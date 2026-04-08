'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { dangKy } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  
  // Trạng thái chung
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi]         = useState('');
  const [tab, setTab]         = useState('login'); // 'login', 'register', 'verify'

  // Dữ liệu Form
  const [form, setForm]       = useState({ username: '', password: '', email: '' });
  const [otp, setOtp]         = useState('');

  // ── 1. GỬI MÃ XÁC NHẬN ĐĂNG KÝ (OTP) ──
  const xulyDangKyBuoc1 = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.email) {
      setLoi('Vui lòng nhập Email, Tên đăng nhập và Mật khẩu.');
      return;
    }
    setDangXuLy(true); setLoi('');
    try {
      // Yêu cầu Backend gửi mã OTP về Gmail
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, username: form.username })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.msg);
      
      // Chuyển sang màn hình nhập mã OTP
      setTab('verify');
    } catch (err) {
      setLoi(err.message || 'Lỗi gửi yêu cầu xác thực');
    } finally {
      setDangXuLy(false);
    }
  };

  // ── 2. XÁC NHẬN OTP & HOÀN TẤT ĐĂNG KÝ ──
  const xulyXacNhanDk = async (e) => {
    e.preventDefault();
    setDangXuLy(true); setLoi('');
    try {
      const res = await dangKy({ ...form, otp, role: 'user' });
      // Đăng ký xong, tự động đăng nhập
      await signIn('credentials', { redirect: false, username: form.username, password: form.password });
      window.location.href = '/';
    } catch (err) {
      setLoi(err.response?.data?.msg || err.message);
    } finally {
      setDangXuLy(false);
    }
  };

  // ── 3. ĐĂNG NHẬP XÀI MẬT KHẨU HOẶC GOOGLE/GITHUB ──
  const xulyDangNhap = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return setLoi('Nhập đủ username và password!');
    setDangXuLy(true); setLoi('');
    
    const res = await signIn('credentials', { redirect: false, username: form.username, password: form.password });
    if (res.error) {
      setLoi(res.error); setDangXuLy(false);
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-logo">N</div>
        <div className="login-title">NEXUS Home OS</div>
        <div className="login-sub">
          {tab === 'login' && 'Đăng nhập vào hệ thống'}
          {tab === 'register' && 'Đăng ký tài khoản mới'}
          {tab === 'verify' && `Đã gửi mã vào ${form.email}`}
        </div>

        {tab === 'verify' ? (
          // Form Nhập Cấp Mã Xác Thực (OTP)
          <form onSubmit={xulyXacNhanDk}>
            <div className="form-group">
              <label className="form-label">Mã xác thực (6 số)</label>
              <input 
                className="form-input" type="text" placeholder="Nhập mã xác nhận..." 
                value={otp} onChange={e => setOtp(e.target.value)} maxLength={6}
              />
            </div>
            {loi && <div className="login-error">{loi}</div>}
            <button className="login-btn" type="submit" disabled={dangXuLy}>
              {dangXuLy ? '⏳ Đang xác nhận...' : 'Xác nhận & Tạo tài khoản'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 15 }}>
              <button type="button" onClick={() => setTab('register')} style={{color: 'var(--text-muted)', fontSize: 13, textDecoration: 'underline'}}>Quay lại sửa email</button>
            </div>
          </form>
        ) : (
          // Form Đăng nhập hoặc Đăng ký
          <form onSubmit={tab === 'login' ? xulyDangNhap : xulyDangKyBuoc1}>
            {tab === 'register' && (
              <div className="form-group">
                <label className="form-label">Gmail của bạn</label>
                <input 
                  className="form-input" type="email" placeholder="ví dụ: abc@gmail.com" 
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Tên đăng nhập</label>
              <input 
                className="form-input" type="text" placeholder="Nhập tên đăng nhập..." 
                value={form.username} onChange={e => setForm({...form, username: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input 
                className="form-input" type="password" placeholder="Nhập mật khẩu..." 
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>
            {loi && <div className="login-error">{loi}</div>}
            
            <button className="login-btn" type="submit" disabled={dangXuLy}>
              {dangXuLy ? '⏳ Đang xử lý...' : (tab === 'login' ? 'Đăng nhập →' : 'Gửi mã xác nhận Gmail')}
            </button>

            <div style={{ textAlign: 'center', marginTop: 15 }}>
              {tab === 'login' ? 
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Chưa có tài khoản? <button type="button" onClick={() => {setTab('register'); setLoi('');}} style={{color: 'var(--accent)', fontWeight: 600}}>Đăng ký ngay</button></span> :
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Đã có tài khoản? <button type="button" onClick={() => {setTab('login'); setLoi('');}} style={{color: 'var(--accent)', fontWeight: 600}}>Quay về Đăng nhập</button></span>
              }
            </div>
          </form>
        )}

        <div className="oauth-divider"><span>HOẶC</span></div>
        <div className="oauth-buttons">
          <button className="oauth-btn" onClick={() => signIn('google', { callbackUrl: '/' })}>
           <span style={{color: '#EA4335'}}>G</span> Google
          </button>
          <button className="oauth-btn" onClick={() => signIn('github', { callbackUrl: '/' })}>
            <span style={{color: '#fff'}}>🐙</span> GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
