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

export const GIAI_DOAN_DA_XONG = 4;

// vaiTro: các vai trò được thấy mục menu này. Backend vẫn kiểm tra lại mọi API —
// ẩn menu chỉ để giao diện gọn, KHÔNG phải lớp bảo mật.
export const MENU = [
  { to: '/to-chuc', nhan: 'Tổ chức', icon: 'soDo', vaiTro: ['admin', 'hr', 'nhan_vien'], tuGiaiDoan: 2 },
  { to: '/nhan-su', nhan: 'Nhân sự', icon: 'nhieuNguoi', vaiTro: ['admin', 'hr'], tuGiaiDoan: 3 },
  { to: '/ho-so-cua-toi', nhan: 'Hồ sơ của tôi', icon: 'nguoi', vaiTro: ['nhan_vien'], tuGiaiDoan: 3 },
  { to: '/cham-cong', nhan: 'Chấm công', icon: 'dongHo', vaiTro: ['admin', 'hr'], tuGiaiDoan: 6 },
  { to: '/cham-cong/cua-toi', nhan: 'Chấm công của tôi', icon: 'dongHo', vaiTro: ['nhan_vien'], tuGiaiDoan: 7 },
  { to: '/don-tu', nhan: 'Đơn từ', icon: 'donTu', vaiTro: ['admin', 'hr', 'nhan_vien'], tuGiaiDoan: 8 },
  { to: '/bao-hiem-thue', nhan: 'Bảo hiểm & Thuế', icon: 'khien', vaiTro: ['admin', 'hr'], tuGiaiDoan: 9 },
  { to: '/luong', nhan: 'Lương', icon: 'tien', vaiTro: ['admin', 'hr'], tuGiaiDoan: 10 },
  { to: '/phieu-luong', nhan: 'Phiếu lương của tôi', icon: 'tien', vaiTro: ['nhan_vien'], tuGiaiDoan: 10 },
  { to: '/bao-cao', nhan: 'Báo cáo', icon: 'bieuDo', vaiTro: ['admin', 'hr'], tuGiaiDoan: 11 },
  { to: '/quan-tri', nhan: 'Quản trị', icon: 'caiDat', vaiTro: ['admin', 'hr'], tuGiaiDoan: 2 },
];

export const menuCuaVaiTro = (vaiTro) =>
  MENU.filter((m) => m.vaiTro.includes(vaiTro) && m.tuGiaiDoan <= GIAI_DOAN_DA_XONG);

export const layChuCaiDau = (ten) => (ten?.trim()?.[0] ?? '?').toUpperCase();
