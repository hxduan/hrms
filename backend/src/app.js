const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('express-async-errors'); // phải require TRƯỚC khi tạo router, tự bắt lỗi async

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const passport = require('./config/passport');
const { xuLyLoi } = require('./middleware/xuLyLoi');

const app = express();
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ].filter(Boolean),
  }),
);
app.use(express.json());
app.use(morgan('combined'));
app.use(passport.initialize());

// ---- Routes ----
app.use('/auth', require('./routes/auth'));
// Các routes tiếp theo (to-chuc, nhan-su, cong-luong...) thêm dần ở Giai
// đoạn sau, theo đúng khuôn: app.use('/duong-dan', require('./routes/x'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path === '/health' || req.path.startsWith('/auth')) {
      return next();
    }

    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// LUÔN đăng ký middleware xử lý lỗi SAU CÙNG
app.use(xuLyLoi);

module.exports = app;
