const { choPhepKhiBatDoiMatKhau } = require('../src/services/batDoiMatKhau');

describe('choPhepKhiBatDoiMatKhau — tài khoản đang dùng mật khẩu tạm chỉ được gọi 2 API', () => {
  test('cho phép xem thông tin mình và đổi mật khẩu', () => {
    expect(choPhepKhiBatDoiMatKhau('GET', '/auth/me')).toBe(true);
    expect(choPhepKhiBatDoiMatKhau('POST', '/auth/doi-mat-khau')).toBe(true);
  });
  test('bỏ qua query string, dấu / cuối và chữ hoa/thường của phương thức', () => {
    expect(choPhepKhiBatDoiMatKhau('get', '/auth/me?x=1')).toBe(true);
    expect(choPhepKhiBatDoiMatKhau('POST', '/auth/doi-mat-khau/')).toBe(true);
  });
  test('chặn mọi API còn lại, kể cả đổi email (cần mật khẩu thật) và dữ liệu nghiệp vụ', () => {
    expect(choPhepKhiBatDoiMatKhau('PUT', '/auth/me/email')).toBe(false);
    expect(choPhepKhiBatDoiMatKhau('GET', '/phong-ban')).toBe(false);
    expect(choPhepKhiBatDoiMatKhau('GET', '/tai-khoan')).toBe(false);
    expect(choPhepKhiBatDoiMatKhau('POST', '/phong-ban')).toBe(false);
  });
  test('không bị đánh lừa bằng đường dẫn giống tiền tố hoặc phương thức sai', () => {
    expect(choPhepKhiBatDoiMatKhau('GET', '/auth/me/../tai-khoan')).toBe(false);
    expect(choPhepKhiBatDoiMatKhau('DELETE', '/auth/me')).toBe(false);
    expect(choPhepKhiBatDoiMatKhau('GET', '/auth/doi-mat-khau')).toBe(false);
    expect(choPhepKhiBatDoiMatKhau(undefined, undefined)).toBe(false);
  });
});
