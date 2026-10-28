const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function guiEmailDuyetDon(emailNhanVien, loaiDon, trangThai) {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: emailNhanVien,
    subject: `[HRMS] ${loaiDon} của bạn đã được ${trangThai}`,
    text: `${loaiDon} của bạn đã được ${trangThai}. Đăng nhập hệ thống để xem chi tiết.`,
  });
}

async function guiEmailKhoiPhucMatKhau(email, ma) {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: '[HRMS] Khôi phục mật khẩu',
    text: `Mã khôi phục mật khẩu của bạn là: ${ma}\nMã có hiệu lực trong 30 phút.`,
  });
}

module.exports = { guiEmailDuyetDon, guiEmailKhoiPhucMatKhau };
