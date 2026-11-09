import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import DiaChiChon from '../../components/DiaChiChon';
import { useToast } from '../../components/Feedback';
import FormModal from '../../components/FormModal';
import FormPanel from '../../components/FormPanel';
import { ManHinhTai, ThongBao, TieuDeTrang } from '../../components/ui';
import useTaiDuLieu from '../../hooks/useTaiDuLieu';
import { homNayYMD } from '../../utils/chuoi';

const mau = (re, tb) => ({ mau: re, thongBaoMau: tb });
const NHOM = (key, nhan) => ({ key, type: 'tuyChinh', rong: true, khongGui: true, render: () => <h3 className="hr-nhom-tieu-de">{nhan}</h3> });

/**
 * Thêm / sửa hồ sơ nhân viên (trang riêng vì nhiều trường).
 *   /nhan-su/them        — thêm mới: chọn phòng ban/chức vụ/chức danh, kiểm tra định biên ngay khi chọn
 *   /nhan-su/:id/sua     — sửa thông tin cá nhân. Vị trí công tác chỉ đổi được ở tab "Quá trình công tác".
 */
export default function FormNhanVien() {
  const { id } = useParams();
  const sua = !!id;
  const dieuHuong = useNavigate();
  const toast = useToast();

  const hoSo = useTaiDuLieu(sua ? `/nhan-vien/${id}` : '', undefined, { khoiTao: null, tat: !sua });
  const phongBan = useTaiDuLieu('/phong-ban');
  const chucVu = useTaiDuLieu('/chuc-vu');
  const chucDanh = useTaiDuLieu('/chuc-danh');

  const [giaTriHienTai, setGiaTriHienTai] = useState({});
  const [dinhBien, setDinhBien] = useState(null);
  const [loiDinhBien, setLoiDinhBien] = useState('');
  const [vuot, setVuot] = useState(null); // { payload, canhBao }

  // Kiểm tra định biên ngay khi chọn xong phòng ban + chức danh (chỉ khi thêm mới)
  const pb = giaTriHienTai.PhongBanId;
  const cd = giaTriHienTai.ChucDanhId;
  useEffect(() => {
    if (sua || !pb || !cd) {
      setDinhBien(null);
      setLoiDinhBien('');
      return undefined;
    }
    let huy = false;
    setLoiDinhBien('');
    api.post('/nhan-vien/kiem-tra-dinh-bien', { phongBanId: Number(pb), chucDanhId: Number(cd) })
      .then((r) => !huy && setDinhBien(r.data))
      .catch((e) => {
        if (!huy) {
          setDinhBien(null);
          setLoiDinhBien(e.response?.data?.message ?? 'Không kiểm tra được định biên. Hệ thống sẽ kiểm tra lại khi lưu.');
        }
      });
    return () => { huy = true; };
  }, [sua, pb, cd]);

  const kiemTraTrung = (truong, boQuaId) => async (v) => {
    const r = await api.get('/nhan-vien/kiem-tra', { params: { truong, giaTri: v, boQuaId } });
    return r.data.daTonTai ? r.data.message : null;
  };

  const cacTruong = useMemo(() => {
    const cuaSua = sua ? Number(id) : undefined;
    const viTri = sua
      ? []
      : [
          NHOM('_n2', 'Vị trí công tác'),
          { key: 'PhongBanId', nhan: 'Phòng ban', type: 'select', kieuSo: true, batBuoc: true, options: phongBan.duLieu.map((p) => ({ value: p.Id, label: `${'\u00A0\u00A0\u00A0'.repeat(p.Cap)}${p.Cap ? '└ ' : ''}${p.Ten}` })) },
          { key: 'ChucDanhId', nhan: 'Chức danh', type: 'select', kieuSo: true, batBuoc: true, options: chucDanh.duLieu.map((c) => ({ value: c.Id, label: c.Ten })) },
          { key: 'ChucVuId', nhan: 'Chức vụ', type: 'select', kieuSo: true, placeholder: '— Không —', options: chucVu.duLieu.map((c) => ({ value: c.Id, label: c.TenPhongBan ? `${c.Ten} (${c.TenPhongBan})` : c.Ten })) },
        ];
    return [
      NHOM('_n1', 'Thông tin cá nhân'),
      { key: 'HoTen', nhan: 'Họ tên', batBuoc: true, maxLength: 200, rong: true },
      { key: 'GioiTinh', nhan: 'Giới tính', type: 'select', options: ['Nam', 'Nữ', 'Khác'].map((v) => ({ value: v, label: v })), placeholder: '— Chọn —' },
      { key: 'NgaySinh', nhan: 'Ngày sinh', type: 'date', max: homNayYMD() },
      { key: 'SoCCCD', nhan: 'Số CCCD', maxLength: 12, ...mau(/^\d{12}$/, 'Số CCCD gồm đúng 12 chữ số'), kiemTraTrung: kiemTraTrung('CCCD', cuaSua) },
      { key: 'SoDienThoai', nhan: 'Số điện thoại', maxLength: 20, ...mau(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ (VD 0912345678)') },
      { key: 'Email', nhan: 'Email', type: 'email', maxLength: 255, goiY: 'Dùng để gửi phiếu lương và thông báo', kiemTraTrung: kiemTraTrung('Email', cuaSua), rong: true },
      NHOM('_n3', 'Địa chỉ'),
      { key: 'MaTinh', type: 'an' }, { key: 'Tinh', type: 'an' }, { key: 'MaPhuongXa', type: 'an' }, { key: 'PhuongXa', type: 'an' },
      {
        key: '_diaChi', type: 'tuyChinh', rong: true, khongGui: true, nhan: 'Tỉnh/Thành → Phường/Xã',
        render: ({ tatCa, datGiaTri }) => (
          <DiaChiChon
            giaTri={{ MaTinh: tatCa.MaTinh, Tinh: tatCa.Tinh, MaPhuongXa: tatCa.MaPhuongXa, PhuongXa: tatCa.PhuongXa }}
            onDoi={(o) => Object.entries(o).forEach(([k, v]) => datGiaTri(k, v))}
          />
        ),
      },
      { key: 'DiaChiChiTiet', nhan: 'Số nhà, đường, thôn/xóm', maxLength: 300, rong: true },
      ...viTri,
      NHOM('_n4', 'Công việc, bảo hiểm & thuế'),
      { key: 'NgayVaoLam', nhan: 'Ngày vào làm', type: 'date', batBuoc: true },
      { key: 'SoSoBHXH', nhan: 'Số sổ BHXH', maxLength: 10, ...mau(/^\d{10}$/, 'Số sổ BHXH gồm đúng 10 chữ số'), kiemTraTrung: kiemTraTrung('SoSoBHXH', cuaSua) },
      { key: 'MaSoThue', nhan: 'Mã số thuế', maxLength: 14, ...mau(/^\d{10}(-?\d{3})?$/, 'Mã số thuế gồm 10 hoặc 13 chữ số'), kiemTraTrung: kiemTraTrung('MaSoThue', cuaSua) },
      { key: 'VungLuong', nhan: 'Vùng lương tối thiểu', type: 'select', kieuSo: true, batBuoc: true, options: [1, 2, 3, 4].map((v) => ({ value: v, label: `Vùng ${['', 'I', 'II', 'III', 'IV'][v]}` })), goiY: 'Dùng để xác định lương tối thiểu / trần BHTN khi tính bảo hiểm' },
      { key: 'TenNganHang', nhan: 'Ngân hàng', maxLength: 200 },
      { key: 'SoTaiKhoanNganHang', nhan: 'Số tài khoản', maxLength: 20, ...mau(/^\d{6,20}$/, 'Số tài khoản gồm 6–20 chữ số') },
    ];
  }, [sua, id, phongBan.duLieu, chucDanh.duLieu, chucVu.duLieu]);

  const giaTriBanDau = useMemo(() => {
    if (!sua) return { VungLuong: 1, NgayVaoLam: homNayYMD() };
    const h = hoSo.duLieu;
    return h
      ? { HoTen: h.HoTen, GioiTinh: h.GioiTinh, NgaySinh: h.NgaySinh, SoCCCD: h.SoCCCD, SoDienThoai: h.SoDienThoai, Email: h.Email, Tinh: h.Tinh, MaTinh: h.MaTinh, PhuongXa: h.PhuongXa, MaPhuongXa: h.MaPhuongXa, DiaChiChiTiet: h.DiaChiChiTiet, NgayVaoLam: h.NgayVaoLam, SoSoBHXH: h.SoSoBHXH, MaSoThue: h.MaSoThue, VungLuong: h.VungLuong, TenNganHang: h.TenNganHang, SoTaiKhoanNganHang: h.SoTaiKhoanNganHang }
      : {};
  }, [sua, hoSo.duLieu]);

  async function luu(payload) {
    if (sua) {
      await api.put(`/nhan-vien/${id}`, payload);
      toast.thanhCong('Đã cập nhật hồ sơ');
      dieuHuong(`/nhan-su/${id}`);
      return;
    }
    try {
      const r = await api.post('/nhan-vien', payload);
      toast.thanhCong(`Đã thêm nhân viên ${r.data.MaNhanVien}`);
      dieuHuong(`/nhan-su/${r.data.Id}`);
    } catch (e) {
      if (e.response?.data?.maLoi === 'VUOT_DINH_BIEN') {
        setVuot({ payload, canhBao: e.response.data.message });
        return;
      }
      throw e;
    }
  }

  const dangTai = (sua && hoSo.dangTai) || phongBan.dangTai || chucDanh.dangTai;
  if (dangTai) return <ManHinhTai />;
  if (sua && hoSo.loi) return <ThongBao loai="loi">{hoSo.loi}</ThongBao>;

  return (
    <>
      <TieuDeTrang tieuDe={sua ? `Sửa hồ sơ — ${hoSo.duLieu?.HoTen ?? ''}` : 'Thêm nhân viên'} moTa={sua ? hoSo.duLieu?.MaNhanVien : 'Mã nhân viên được hệ thống tự cấp'}>
        <Link to={sua ? `/nhan-su/${id}` : '/nhan-su'} className="hr-btn" style={{ textDecoration: 'none' }}>← Quay lại</Link>
      </TieuDeTrang>

      {sua && (
        <ThongBao loai="thongTin">
          Phòng ban, chức vụ và chức danh <b>không sửa ở đây</b> — hãy thêm biến động ở tab <Link to={`/nhan-su/${id}?tab=qua-trinh`}>Quá trình công tác</Link> để có lịch sử và kiểm tra định biên.
        </ThongBao>
      )}
      {!sua && dinhBien && (
        <ThongBao loai={dinhBien.duocPhep ? (dinhBien.coDinhBien ? 'ok' : 'thongTin') : 'vang'}>
          {dinhBien.duocPhep
            ? dinhBien.coDinhBien ? `Định biên còn ${dinhBien.conLai} chỗ cho vị trí này (đang giữ ${dinhBien.dangGiu}/${dinhBien.soDuyet}).` : dinhBien.canhBao
            : dinhBien.canhBao}
        </ThongBao>
      )}
      {!sua && loiDinhBien && <ThongBao loai="thongTin">{loiDinhBien}</ThongBao>}

      <div className="hr-the hr-the-than">
        <FormPanel
          key={sua ? `sua-${hoSo.duLieu?.Id}` : 'them'}
          luoi
          cacTruong={cacTruong}
          giaTriBanDau={giaTriBanDau}
          onDoi={setGiaTriHienTai}
          onSubmit={luu}
          nhanNop={sua ? 'Lưu thay đổi' : 'Thêm nhân viên'}
          onHuy={() => dieuHuong(sua ? `/nhan-su/${id}` : '/nhan-su')}
        />
      </div>

      {vuot && (
        <FormModal
          tieuDe="Vượt định biên — cần lý do"
          cacTruong={[{ key: 'lyDoVuotDinhBien', nhan: 'Lý do vượt định biên', type: 'textarea', batBuoc: true, maxLength: 300, goiY: 'Lý do được ghi vào nhật ký thay đổi' }]}
          phanPhu={<ThongBao loai="vang">{vuot.canhBao}</ThongBao>}
          nhanNop="Vẫn thêm nhân viên"
          onDong={() => setVuot(null)}
          onSubmit={async (p) => {
            const r = await api.post('/nhan-vien', { ...vuot.payload, xacNhanVuotDinhBien: true, lyDoVuotDinhBien: p.lyDoVuotDinhBien });
            toast.thanhCong(`Đã thêm nhân viên ${r.data.MaNhanVien}`);
            dieuHuong(`/nhan-su/${r.data.Id}`);
          }}
        />
      )}
    </>
  );
}
