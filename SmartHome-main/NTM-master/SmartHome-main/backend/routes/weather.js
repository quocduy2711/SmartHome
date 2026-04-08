const express = require('express');
const router = express.Router();
const { authGuard } = require('../middleware/auth');

// Cache lưu trữ thời tiết để tránh gọi API quá nhiều
let weatherCache = {
  data: null,
  timestamp: 0
};
const CACHE_DURATION = 10 * 60 * 1000; // 10 phút

// ============================================================
// GET /api/weather/outdoor – Lấy thời tiết ngoài trời
// ============================================================
router.get('/outdoor', authGuard, async (req, res, next) => {
  console.log('[API] /api/weather/outdoor được gọi');
  try {
    const now = Date.now();
    
    // Nếu cache còn hiệu lực, trả về dữ liệu cache
    if (weatherCache.data && (now - weatherCache.timestamp < CACHE_DURATION)) {
      console.log('[API] Trả về dữ liệu thời tiết từ cache');
      return res.json({
        success: true,
        data: weatherCache.data,
        cached: true
      });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (apiKey) {
      console.log(`[API] OPENWEATHER_API_KEY đang dùng (4 ký tự đầu): ${apiKey.substring(0, 4)}***`);
    } else {
      console.warn('⚠️ Thiếu OPENWEATHER_API_KEY trong .env');
    }

    let result = null;

    // 1. Thử gọi OpenWeatherMap nếu có API Key
    if (apiKey) {
      try {
        const lat = 10.8278;
        const lon = 106.6667;
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        
        console.log('[API] Đang gọi OpenWeatherMap API...');
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[API] OpenWeatherMap Response OK:', { temp: data.main.temp, feels_like: data.main.feels_like });
          result = {
            temp: data.main.temp,
            feels_like: data.main.feels_like,
            timestamp: new Date()
          };
        } else {
          const errData = await response.json();
          console.error('[API] Lỗi OpenWeatherMap API:', errData);
          // Cho phép chạy tiếp xuống fallback
        }
      } catch (owmError) {
        console.error('[API] Lỗi fetch OpenWeatherMap:', owmError.message);
        // Cho phép chạy tiếp xuống fallback
      }
    }

    // 2. Fallback dùng wttr.in nếu OpenWeatherMap thất bại hoặc không có key
    if (!result) {
      console.log('[API] Chuyển qua dùng fallback API: wttr.in');
      try {
        const fallbackUrl = 'https://wttr.in/Go+Vap,Ho+Chi+Minh+City?format=j1';
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'curl/7.68.0'
          }
        });
        
        if (fallbackResponse.ok) {
          try {
            const fallbackData = await fallbackResponse.json();
            const current = fallbackData.current_condition[0];
            
            console.log('[API] wttr.in Response OK:', { temp: current.temp_C, feels_like: current.FeelsLikeC });
            result = {
              temp: parseFloat(current.temp_C),
              feels_like: parseFloat(current.FeelsLikeC),
              timestamp: new Date()
            };
          } catch (jsonErr) {
            console.error('[API] Lỗi parse JSON từ wttr.in:', jsonErr.message);
            return res.status(500).json({ success: false, msg: 'API thời tiết trả về dữ liệu lỗi' });
          }
        } else {
          console.error('[API] Fallback wttr.in cũng thất bại, status:', fallbackResponse.status);
          return res.status(500).json({ success: false, msg: 'Không thể lấy dữ liệu thời tiết từ các nguồn' });
        }
      } catch (wttrError) {
        console.error('[API] Lỗi fetch wttr.in:', wttrError.message);
        return res.status(500).json({ success: false, msg: 'Lỗi server khi fetch dữ liệu thời tiết' });
      }
    }

    // Lưu vào cache
    weatherCache = {
      data: result,
      timestamp: now
    };

    res.json({
      success: true,
      data: result,
      cached: false
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
