/** Nhãn hiển thị + cấu hình menu theo vai trò. Là NGUỒN DUY NHẤT cho phân quyền phía giao diện. */
export const NHAN_VAI_TRO = {
  admin: 'Quản trị viên',
  hr: 'Nhân sự (HR)',
  nhan_vien: 'Nhân viên',
};

export const MO_TA_VAI_TRO = {
  admin: 'Toàn quyền: quản lý tổ chức, nhân sự, tài khoản, duyệt và đổi vai trò.',
  hr: 'Quản lý tổ chức, nhân sự, công lương và tài khoản nhân viên.',
  nhan_vien: 'Xem thông tin của mình và các danh mục chung; gửi đơn từ.',
};

// vaiTro: các vai trò được thấy mục menu này. Backend vẫn kiểm tra lại mọi API —
// ẩn menu chỉ để giao diện gọn, KHÔNG phải lớp bảo mật.
export const MENU = [
  { to: '/to-chuc', nhan: 'Tổ chức', icon: 'soDo', vaiTro: ['admin', 'hr', 'nhan_vien'] },
  { to: '/nhan-su', nhan: 'Nhân sự', icon: 'nhieuNguoi', vaiTro: ['admin', 'hr'] },
  { to: '/ho-so-cua-toi', nhan: 'Hồ sơ của tôi', icon: 'nguoi', vaiTro: ['nhan_vien'] },
  { to: '/cong-luong', nhan: 'Công - Lương', icon: 'dongHo', vaiTro: ['admin', 'hr', 'nhan_vien'] },
  { to: '/quan-tri', nhan: 'Quản trị', icon: 'caiDat', vaiTro: ['admin', 'hr'] },
];

export const layChuCaiDau = (ten) => (ten?.trim()?.[0] ?? '?').toUpperCase();
