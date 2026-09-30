const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function guiEmailKhoiPhucMatKhau(email, maKhoiPhuc) {
  const link = `${process.env.FRONTEND_URL}/dat-lai-mat-khau?ma=${maKhoiPhuc}`;
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: '[HRMS] Khôi phục mật khẩu',
    text: `Nhấn vào link sau để đặt lại mật khẩu (hết hạn sau 30 phút): ${link}`,
  });
}

async function guiEmailDuyetDon(emailNhanVien, loaiDon, trangThai) {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: emailNhanVien,
    subject: `[HRMS] ${loaiDon} của bạn đã được ${trangThai}`,
    text: `${loaiDon} của bạn đã được ${trangThai}. Đăng nhập hệ thống để xem chi tiết.`,
  });
}

module.exports = { guiEmailKhoiPhucMatKhau, guiEmailDuyetDon };
