import { ThongBao, TieuDeTrang } from '../components/ui';

/** Trang giữ chỗ cho các module sẽ làm ở các Giai đoạn sau. */
export default function SapCo({ ten, giaiDoan }) {
  return (
    <>
      <TieuDeTrang tieuDe={ten} />
      <ThongBao loai="thongTin">Mục này sẽ được xây dựng ở Giai đoạn {giaiDoan}.</ThongBao>
    </>
  );
}

export function KhongTimThay() {
  return (
    <>
      <TieuDeTrang tieuDe="Không tìm thấy trang" />
      <ThongBao loai="vang">Địa chỉ bạn truy cập không tồn tại.</ThongBao>
    </>
  );
}
