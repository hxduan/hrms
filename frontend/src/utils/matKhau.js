/** Phải KHỚP chính sách ở backend (validation/taiKhoan.js): 8–72 ký tự, có chữ cái và chữ số. */
export function kiemTraMatKhauManh(v) {
  if (v.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
  if (v.length > 72) return 'Mật khẩu tối đa 72 ký tự';
  if (!/[A-Za-z]/.test(v)) return 'Mật khẩu cần ít nhất 1 chữ cái';
  if (!/\d/.test(v)) return 'Mật khẩu cần ít nhất 1 chữ số';
  return null;
}

export const GOI_Y_MAT_KHAU = 'Ít nhất 8 ký tự, gồm cả chữ và số';

export const truongMatKhauMoi = (nhan = 'Mật khẩu', key = 'matKhau') => ({
  key,
  nhan,
  type: 'password',
  batBuoc: true,
  goiY: GOI_Y_MAT_KHAU,
  kiemTra: (v) => kiemTraMatKhauManh(v),
});

export const truongNhapLaiMatKhau = (khoaGoc = 'matKhau') => ({
  key: 'nhapLai',
  nhan: 'Nhập lại mật khẩu',
  type: 'password',
  batBuoc: true,
  khongGui: true,
  kiemTra: (v, tatCa) => (v !== tatCa[khoaGoc] ? 'Mật khẩu nhập lại không khớp' : null),
});
