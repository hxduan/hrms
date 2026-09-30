require('dotenv').config();
require('express-async-errors'); // phải require TRƯỚC khi tạo router, tự bắt lỗi async

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('./config/passport');
const { xuLyLoi } = require('./middleware/xuLyLoi');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use(morgan('combined'));
app.use(passport.initialize());

// ---- Routes ----
app.use('/auth', require('./routes/auth'));
// Các routes tiếp theo (to-chuc, nhan-su, cong-luong...) thêm dần ở Giai
// đoạn sau, theo đúng khuôn: app.use('/duong-dan', require('./routes/x'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// LUÔN đăng ký middleware xử lý lỗi SAU CÙNG
app.use(xuLyLoi);

module.exports = app;
