/**
 * FILE KIỂM THỬ API – NHÀ THÔNG MINH
 * Chạy bằng lệnh: node tests/api.test.js
 * Yêu cầu: Backend đang chạy tại http://localhost:5000
 */

const BASE_URL = 'http://localhost:5000';
let TOKEN = '';   // Sẽ được set sau khi đăng nhập
let DEVICE_ID = '';

// ── Hàm tiện ích ─────────────────────────────────────
const mauXanh   = (str) => `\x1b[32m${str}\x1b[0m`;
const mauDo     = (str) => `\x1b[31m${str}\x1b[0m`;
const mauVang   = (str) => `\x1b[33m${str}\x1b[0m`;
const mauXanhDu = (str) => `\x1b[36m${str}\x1b[0m`;

let tongKiem = 0, tongThanhCong = 0, tongThatBai = 0;

async function goiAPI(method, path, body = null, headers = {}) {
  const tuyCon = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { 'x-auth-token': TOKEN } : {}),
      ...headers,
    },
  };
  if (body) tuyCon.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${path}`, tuyCon);
    const data = await res.json();
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, data: { msg: 'Lỗi kết nối: ' + err.message } };
  }
}

async function kiemTra(tenTest, status, kiTraFn) {
  tongKiem++;
  const okStatus = status >= 200 && status < 300;
  const okExtra  = kiTraFn ? kiTraFn() : true;
  const ok = okStatus && okExtra;
  if (ok) {
    tongThanhCong++;
    console.log(`  ${mauXanh('✓')} ${tenTest}`);
  } else {
    tongThatBai++;
    console.log(`  ${mauDo('✗')} ${tenTest}  [status: ${status}]`);
  }
}

// ════════════════════════════════════════════════════
async function testHeThong() {
  console.log(mauXanhDu('\n══ Kiểm tra hệ thống ══'));
  const { status, data } = await goiAPI('GET', '/health');
  await kiemTra('Health check trả về ok', status, () => data.status === 'ok');
}

// ════════════════════════════════════════════════════
async function testDangKy() {
  console.log(mauXanhDu('\n══ Kiểm tra đăng ký ══'));

  // Đăng ký thành công
  const { status, data } = await goiAPI('POST', '/api/auth/register', {
    username: `admin_test_${Date.now()}`,
    password: 'password123',
    email: `test${Date.now()}@example.com`,
    role: 'admin',
  });
  await kiemTra('Đăng ký tài khoản mới thành công (201)', status, () => status === 201 && data.token);
  if (data.token) TOKEN = data.token; // Dùng token này cho các test tiếp theo

  // Thiếu password
  const { status: s2 } = await goiAPI('POST', '/api/auth/register', { username: 'abc' });
  await kiemTra('Thiếu mật khẩu → trả về 400', s2, () => s2 === 400);
}

// ════════════════════════════════════════════════════
async function testDangNhap() {
  console.log(mauXanhDu('\n══ Kiểm tra đăng nhập ══'));

  // Đăng ký tài khoản cố định để test
  await goiAPI('POST', '/api/auth/register', {
    username: 'test_admin',
    password: 'password123',
    role: 'admin',
  });

  // Đăng nhập đúng
  const { status, data } = await goiAPI('POST', '/api/auth/login', {
    username: 'test_admin',
    password: 'password123',
  });
  await kiemTra('Đăng nhập đúng thông tin → 200 + token', status, () => data.token);
  if (data.token) TOKEN = data.token;

  // Sai mật khẩu
  const { status: s2 } = await goiAPI('POST', '/api/auth/login', {
    username: 'test_admin',
    password: 'satmkhau',
  });
  await kiemTra('Sai mật khẩu → 401', s2, () => s2 === 401);

  // Thiếu username
  const { status: s3 } = await goiAPI('POST', '/api/auth/login', { password: '123' });
  await kiemTra('Thiếu username → 400', s3, () => s3 === 400);

  // Lấy thông tin cá nhân
  const { status: s4, data: d4 } = await goiAPI('GET', '/api/auth/me');
  await kiemTra('Lấy thông tin cá nhân (có token) → 200', s4, () => d4.user);

  // Không có token
  TOKEN = '';
  const { status: s5 } = await goiAPI('GET', '/api/auth/me');
  await kiemTra('Không có token → 401', s5, () => s5 === 401);
  // Khôi phục token
  const r = await goiAPI('POST', '/api/auth/login', { username: 'test_admin', password: 'password123' });
  TOKEN = r.data.token;
}

// ════════════════════════════════════════════════════
async function testThietBi() {
  console.log(mauXanhDu('\n══ Kiểm tra API thiết bị ══'));

  // Thêm thiết bị mới
  const { status: s1, data: d1 } = await goiAPI('POST', '/api/devices', {
    name: 'Đèn Test',
    type: 'light',
    location: 'Phòng kiểm thử',
    mqttTopic: `smarthome/device/test_${Date.now()}`,
    state: { isOn: false },
  });
  await kiemTra('Thêm thiết bị mới (Admin) → 201', s1, () => s1 === 201 && d1.data?._id);
  if (d1.data?._id) DEVICE_ID = d1.data._id;

  // Lấy danh sách
  const { status: s2 } = await goiAPI('GET', '/api/devices');
  await kiemTra('Lấy danh sách thiết bị → 200', s2, () => s2 === 200);

  // Filter theo type
  const { status: s3 } = await goiAPI('GET', '/api/devices?type=light');
  await kiemTra('Lọc theo type=light → 200', s3, () => s3 === 200);

  // Lấy theo ID
  if (DEVICE_ID) {
    const { status: s4, data: d4 } = await goiAPI('GET', `/api/devices/${DEVICE_ID}`);
    await kiemTra('Lấy thiết bị theo ID → 200', s4, () => d4.data?._id === DEVICE_ID);

    // Bật/tắt
    const { status: s5, data: d5 } = await goiAPI('POST', `/api/devices/${DEVICE_ID}/toggle`);
    await kiemTra('Toggle bật/tắt → 200', s5, () => d5.success);
    console.log(`    → State sau toggle: isOn = ${d5.data?.state?.isOn}`);

    // Điều khiển
    const { status: s6 } = await goiAPI('POST', `/api/devices/${DEVICE_ID}/control`, {
      action: 'turn_on',
      payload: { isOn: true },
    });
    await kiemTra('Điều khiển thiết bị (turn_on) → 2xx', s6, () => s6 >= 200 && s6 < 300);

    // Gửi lệnh không có action
    const { status: s7 } = await goiAPI('POST', `/api/devices/${DEVICE_ID}/control`, {
      payload: { isOn: true },
    });
    await kiemTra('Thiếu action → 400', s7, () => s7 === 400);

    // Lịch sử cảm biến
    const { status: s8 } = await goiAPI('GET', `/api/devices/${DEVICE_ID}/history`);
    await kiemTra('Lịch sử cảm biến → 200', s8, () => s8 === 200);

    // Lịch sử lệnh
    const { status: s9 } = await goiAPI('GET', `/api/devices/${DEVICE_ID}/logs`);
    await kiemTra('Lịch sử lệnh → 200', s9, () => s9 === 200);

    // Cập nhật
    const { status: s10 } = await goiAPI('PUT', `/api/devices/${DEVICE_ID}`, { name: 'Đèn test đã sửa' });
    await kiemTra('Cập nhật thiết bị → 200', s10, () => s10 === 200);

    // ID không tồn tại
    const { status: s11 } = await goiAPI('GET', '/api/devices/000000000000000000000000');
    await kiemTra('ID không tồn tại → 404', s11, () => s11 === 404);

    // Xóa
    const { status: s12 } = await goiAPI('DELETE', `/api/devices/${DEVICE_ID}`);
    await kiemTra('Xóa thiết bị → 200', s12, () => s12 === 200);
  }
}

// ════════════════════════════════════════════════════
async function testDuLieu() {
  console.log(mauXanhDu('\n══ Kiểm tra API dữ liệu ══'));

  const { status: s1 } = await goiAPI('GET', '/api/data/summary');
  await kiemTra('Tổng quan dashboard → 200', s1, () => s1 === 200);

  const { status: s2 } = await goiAPI('GET', '/api/data/history');
  await kiemTra('Lịch sử cảm biến → 200', s2, () => s2 === 200);

  const { status: s3 } = await goiAPI('GET', '/api/data/history?type=temperature&limit=10');
  await kiemTra('Lịch sử nhiệt độ (limit 10) → 200', s3, () => s3 === 200);

  const { status: s4 } = await goiAPI('GET', '/api/data/stats?type=temperature&hours=24');
  await kiemTra('Thống kê biểu đồ → 200', s4, () => s4 === 200);

  const { status: s5 } = await goiAPI('GET', '/api/data/logs');
  await kiemTra('Lịch sử lệnh điều khiển → 200', s5, () => s5 === 200);
}

// ════════════════════════════════════════════════════
async function testBaoMat() {
  console.log(mauXanhDu('\n══ Kiểm tra bảo mật ══'));

  const tokenCu = TOKEN;
  TOKEN = 'token_sai_hoan_toan';
  const { status: s1 } = await goiAPI('GET', '/api/devices');
  await kiemTra('Token sai → 401', s1, () => s1 === 401);

  TOKEN = '';
  const { status: s2 } = await goiAPI('POST', '/api/devices', { name: 'X', type: 'light', mqttTopic: 'x' });
  await kiemTra('Không có token → 401', s2, () => s2 === 401);

  TOKEN = tokenCu;

  // Route không tồn tại
  const { status: s3 } = await goiAPI('GET', '/api/khong_ton_tai');
  await kiemTra('Route không tồn tại → 404', s3, () => s3 === 404);
}

// ════════════════════════════════════════════════════
async function chayTatCa() {
  console.log(mauVang('╔══════════════════════════════════════╗'));
  console.log(mauVang('║   KIỂM THỬ API – NHÀ THÔNG MINH    ║'));
  console.log(mauVang('╚══════════════════════════════════════╝'));
  console.log(`  Backend: ${BASE_URL}\n`);

  await testHeThong();
  await testDangKy();
  await testDangNhap();
  await testThietBi();
  await testDuLieu();
  await testBaoMat();

  // Kết quả
  console.log('\n' + mauVang('══════════════════════════════════════'));
  console.log(mauVang(`  KẾT QUẢ KIỂM THỬ`));
  console.log(mauVang('══════════════════════════════════════'));
  console.log(`  Tổng số test : ${tongKiem}`);
  console.log(`  ${mauXanh('Thành công')}    : ${tongThanhCong}`);
  console.log(`  ${mauDo('Thất bại')}      : ${tongThatBai}`);
  console.log(mauVang('══════════════════════════════════════\n'));

  process.exit(tongThatBai > 0 ? 1 : 0);
}

chayTatCa();
