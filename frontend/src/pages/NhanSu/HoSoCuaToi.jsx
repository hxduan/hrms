import ChiTietNhanVien from './ChiTietNhanVien';

/** Nhân viên xem hồ sơ của CHÍNH MÌNH. Dữ liệu lấy từ /nhan-vien/toi nên không thể xem hồ sơ người khác dù đổi địa chỉ. */
export default function HoSoCuaToi() {
  return <ChiTietNhanVien toi />;
}
