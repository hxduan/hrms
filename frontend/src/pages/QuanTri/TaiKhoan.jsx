import { useMemo, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import { useToast, useXacNhan } from '../../components/Feedback';
import FormModal from '../../components/FormModal';
import HistoryModal from '../../components/HistoryModal';
import Icon from '../../components/Icon';
import { HuyHieu, ThongBao } from '../../components/ui';
import useDebounce from '../../hooks/useDebounce';
import useTaiDuLieu from '../../hooks/useTaiDuLieu';
import { dinhDangNgay } from '../../utils/chuoi';
import { GOI_Y_MAT_KHAU, kiemTraMatKhauManh, truongMatKhauMoi } from '../../utils/matKhau';
import { MO_TA_VAI_TRO, NHAN_VAI_TRO } from '../../utils/vaiTro';

const TUY_CHON_VAI_TRO = Object.entries(NHAN_VAI_TRO).map(([value, label]) => ({ value, label }));

export default function TaiKhoan() {
  const { nguoiDung, coVaiTro } = useAuth();
  const laAdmin = coVaiTro('admin');
  const toast = useToast();
  const xacNhan = useXacNhan();

  const [tim, setTim] = useState('');
  const timDaTre = useDebounce(tim, 300);
  const [chiChuaGan, setChiChuaGan] = useState(false);
  const [modal, setModal] = useState(null); // { loai: 'tao' | 'vaiTro' | 'ganHoSo' | 'matKhau', dong? }
  const [lichSu, setLichSu] = useState(null);

  const { duLieu, dangTai, loi, taiLai } = useTaiDuLieu('/tai-khoan', {
    tim: timDaTre.trim() || undefined,
    chuaGanNhanVien: chiChuaGan ? 'true' : undefined,
  });
  const nhanVien = useTaiDuLieu('/tai-khoan/nhan-vien-co-the-gan');
  const soChuaGan = useMemo(() => duLieu.filter((d) => !d.NhanVienId).length, [duLieu]);

  // HR chỉ thao tác được trên tài khoản nhân viên; admin thao tác mọi tài khoản (backend kiểm tra lại)
  const duocDongVao = (d) => laAdmin || d.VaiTro === 'nhan_vien';
  const nhanTaiKhoan = (d) => d.TenDangNhap ?? d.Email ?? `Tài khoản Google #${d.Id}`;

  const cot = [
    {
      key: 'TenDangNhap',
      nhan: 'Tài khoản',
      render: (d) => (
        <div>
          <strong style={{ fontWeight: 600 }}>{d.TenDangNhap ?? 'Tài khoản Google'}</strong>
          {d.Id === nguoiDung.Id && <span className="hr-ma">(bạn)</span>}
          {d.Email && <div className="hr-goi-y">{d.Email}</div>}
          {(!d.HoatDong || d.BatDoiMatKhau) && (
            <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {!d.HoatDong && <HuyHieu loai="do">Đã khóa</HuyHieu>}
              {!!d.BatDoiMatKhau && <HuyHieu loai="vang">Chờ đổi mật khẩu tạm</HuyHieu>}
            </div>
          )}
        </div>
      ),
    },
    { key: 'VaiTro', nhan: 'Vai trò', render: (d) => <HuyHieu loai={d.VaiTro}>{NHAN_VAI_TRO[d.VaiTro]}</HuyHieu> },
    {
      key: 'DangNhapBang',
      nhan: 'Đăng nhập bằng',
      an: 'diDong',
      render: (d) => [d.CoMatKhau && 'Mật khẩu', d.NhaCungCapOAuth && 'Google'].filter(Boolean).join(' + ') || '—',
    },
    {
      key: 'NhanVienId',
      nhan: 'Hồ sơ nhân viên',
      render: (d) =>
        d.NhanVienId ? (
          <span>
            <strong style={{ fontWeight: 600 }}>{d.MaNhanVien}</strong> — {d.HoTen}
          </span>
        ) : (
          <HuyHieu loai="vang">Chưa gắn hồ sơ</HuyHieu>
        ),
    },
    { key: 'NgayTao', nhan: 'Ngày tạo', an: 'diDong', render: (d) => dinhDangNgay(d.NgayTao) },
  ];

  async function guiLienKet(d) {
    const dongY = await xacNhan({
      tieuDe: 'Gửi liên kết đặt lại mật khẩu',
      noiDung: (
        <>
          <p style={{ margin: '0 0 8px' }}>
            Gửi email chứa liên kết đặt lại mật khẩu (hiệu lực 30 phút) tới <strong>{d.Email ?? '(chưa có email)'}</strong>?
          </p>
          <p className="hr-goi-y" style={{ margin: 0 }}>Mật khẩu hiện tại vẫn dùng được cho tới khi người dùng đặt mật khẩu mới.</p>
        </>
      ),
      nutXacNhan: 'Gửi email',
    });
    if (!dongY) return;
    try {
      const r = await api.post(`/tai-khoan/${d.Id}/gui-lien-ket-dat-lai`);
      toast.thanhCong(r.data.message);
    } catch (e) {
      toast.loi(e.response?.data?.message ?? 'Không gửi được email');
    }
  }

  async function doiTrangThai(d, hoatDong) {
    const dongY = await xacNhan({
      tieuDe: hoatDong ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      noiDung: hoatDong ? (
        <p style={{ margin: 0 }}>Cho phép <strong>{nhanTaiKhoan(d)}</strong> đăng nhập trở lại?</p>
      ) : (
        <>
          <p style={{ margin: '0 0 8px' }}>
            Khóa tài khoản <strong>{nhanTaiKhoan(d)}</strong>? Người dùng sẽ bị đăng xuất và không đăng nhập được nữa.
          </p>
          <p className="hr-goi-y" style={{ margin: 0 }}>Dữ liệu không bị xóa; có thể mở khóa bất cứ lúc nào.</p>
        </>
      ),
      nutXacNhan: hoatDong ? 'Mở khóa' : 'Khóa tài khoản',
      nguyHiem: !hoatDong,
    });
    if (!dongY) return;
    try {
      const r = await api.put(`/tai-khoan/${d.Id}/trang-thai`, { hoatDong });
      toast.thanhCong(r.data.message);
      taiLai();
    } catch (e) {
      toast.loi(e.response?.data?.message ?? 'Không đổi được trạng thái');
    }
  }

  const hanhDong = [
    { nhan: 'Gắn / đổi hồ sơ nhân viên', icon: 'nguoi', hien: duocDongVao, onClick: (d) => setModal({ loai: 'ganHoSo', dong: d }) },
    { nhan: 'Đổi vai trò', icon: 'sua', hien: (d) => laAdmin && d.Id !== nguoiDung.Id, onClick: (d) => setModal({ loai: 'vaiTro', dong: d }) },
    { nhan: 'Gửi liên kết đặt lại mật khẩu (email)', icon: 'thu', hien: (d) => duocDongVao(d) && !!d.CoMatKhau && !!d.HoatDong, onClick: guiLienKet },
    { nhan: 'Đặt mật khẩu tạm', icon: 'chia', hien: (d) => duocDongVao(d) && !!d.CoMatKhau, onClick: (d) => setModal({ loai: 'matKhau', dong: d }) },
    { nhan: 'Khóa tài khoản', icon: 'khoa', hien: (d) => duocDongVao(d) && d.Id !== nguoiDung.Id && !!d.HoatDong, onClick: (d) => doiTrangThai(d, false) },
    { nhan: 'Mở khóa tài khoản', icon: 'moKhoa', hien: (d) => duocDongVao(d) && !d.HoatDong, onClick: (d) => doiTrangThai(d, true) },
  ];

  const tuyChonNhanVien = (dong) => {
    const ds = nhanVien.duLieu.map((n) => ({ value: n.Id, label: `${n.MaNhanVien} — ${n.HoTen}` }));
    // Giữ hồ sơ đang gắn trong danh sách để có thể chọn lại / không bị mất lựa chọn hiện tại
    if (dong?.NhanVienId && !ds.some((o) => o.value === dong.NhanVienId)) {
      ds.unshift({ value: dong.NhanVienId, label: `${dong.MaNhanVien} — ${dong.HoTen} (đang gắn)` });
    }
    return ds;
  };

  function moForm() {
    const { loai, dong } = modal;
    const dong_ = () => setModal(null);
    const xong = (thongBao) => {
      toast.thanhCong(thongBao);
      setModal(null);
      taiLai();
      nhanVien.taiLai();
    };

    if (loai === 'tao') {
      const cacTruong = [
        {
          key: 'tenDangNhap',
          nhan: 'Tên đăng nhập',
          batBuoc: true,
          doDaiToiThieu: 3,
          maxLength: 100,
          mau: /^[A-Za-z0-9_.@-]+$/,
          thongBaoMau: 'Chỉ gồm chữ không dấu, số và . _ - @',
          autoComplete: 'off',
          kiemTraTrung: async (v) => {
            const r = await api.get('/auth/kiem-tra-ten', { params: { tenDangNhap: v } });
            return r.data.daTonTai ? 'Tên đăng nhập đã tồn tại' : null;
          },
        },
        { key: 'email', nhan: 'Email', type: 'email', batBuoc: true, maxLength: 255, goiY: 'Nhận mã khôi phục mật khẩu' },
        { ...truongMatKhauMoi('Mật khẩu tạm', 'matKhau'), goiY: `${GOI_Y_MAT_KHAU}. Người dùng sẽ bị buộc đổi mật khẩu ở lần đăng nhập đầu tiên` },
        ...(laAdmin
          ? [{ key: 'vaiTro', nhan: 'Vai trò', type: 'select', batBuoc: true, options: TUY_CHON_VAI_TRO, placeholder: '— Chọn vai trò —' }]
          : []),
        {
          key: 'nhanVienId',
          nhan: 'Gắn hồ sơ nhân viên',
          type: 'select',
          kieuSo: true,
          options: tuyChonNhanVien(null),
          placeholder: '— Chưa gắn (gắn sau) —',
          goiY: nhanVien.duLieu.length === 0 ? 'Chưa có hồ sơ nhân viên nào chưa có tài khoản (hồ sơ nhân viên được tạo ở Giai đoạn 3)' : undefined,
        },
      ];
      return (
        <FormModal
          tieuDe="Tạo tài khoản"
          cacTruong={cacTruong}
          giaTriBanDau={{ vaiTro: laAdmin ? 'nhan_vien' : undefined }}
          onDong={dong_}
          onSubmit={async (payload) => {
            await api.post('/tai-khoan', payload);
            xong('Đã tạo tài khoản');
          }}
        />
      );
    }

    if (loai === 'vaiTro') {
      return (
        <FormModal
          tieuDe={`Đổi vai trò — ${nhanTaiKhoan(dong)}`}
          cacTruong={[
            {
              key: 'vaiTro',
              nhan: 'Vai trò mới',
              type: 'select',
              batBuoc: true,
              options: TUY_CHON_VAI_TRO,
              goiY: MO_TA_VAI_TRO[dong.VaiTro],
            },
          ]}
          giaTriBanDau={{ vaiTro: dong.VaiTro }}
          onDong={dong_}
          onSubmit={async (payload) => {
            await api.put(`/tai-khoan/${dong.Id}/vai-tro`, payload);
            xong('Đã đổi vai trò (có hiệu lực tối đa sau 15 phút hoặc khi người dùng đăng nhập lại)');
          }}
        />
      );
    }

    if (loai === 'ganHoSo') {
      return (
        <FormModal
          tieuDe={`Gắn hồ sơ nhân viên — ${nhanTaiKhoan(dong)}`}
          cacTruong={[
            {
              key: 'nhanVienId',
              nhan: 'Hồ sơ nhân viên',
              type: 'select',
              kieuSo: true,
              options: tuyChonNhanVien(dong),
              placeholder: '— Gỡ liên kết (không gắn hồ sơ nào) —',
              goiY: 'Chỉ hiện hồ sơ đang làm việc và chưa gắn cho tài khoản khác',
            },
          ]}
          giaTriBanDau={{ nhanVienId: dong.NhanVienId }}
          onDong={dong_}
          onSubmit={async (payload) => {
            const r = await api.put(`/tai-khoan/${dong.Id}/gan-nhan-vien`, payload);
            xong(r.data.message);
          }}
        />
      );
    }

    return (
      <FormModal
        tieuDe={`Đặt mật khẩu tạm — ${nhanTaiKhoan(dong)}`}
        cacTruong={[
          {
            key: 'matKhauMoi',
            nhan: 'Mật khẩu tạm',
            type: 'password',
            batBuoc: true,
            goiY: `${GOI_Y_MAT_KHAU}. Người dùng bị đăng xuất khỏi mọi thiết bị và PHẢI đổi mật khẩu ở lần đăng nhập kế tiếp`,
            kiemTra: (v) => kiemTraMatKhauManh(v),
          },
        ]}
        onDong={dong_}
        onSubmit={async (payload) => {
          await api.put(`/tai-khoan/${dong.Id}/dat-lai-mat-khau`, payload);
          xong('Đã đặt mật khẩu tạm — hãy đưa mật khẩu này cho người dùng qua kênh an toàn');
        }}
      />
    );
  }

  return (
    <>
      {loi && <ThongBao loai="loi">{loi}</ThongBao>}
      {!chiChuaGan && soChuaGan > 0 && (
        <ThongBao loai="vang">
          Có <b>{soChuaGan}</b> tài khoản chưa được gắn hồ sơ nhân viên — họ chưa xem được dữ liệu nào.{' '}
          <button type="button" className="hr-btn hr-btn-nho" style={{ marginLeft: 6 }} onClick={() => setChiChuaGan(true)}>
            Chỉ hiện các tài khoản này
          </button>
        </ThongBao>
      )}

      <div className="hr-thanh-cong-cu">
        <div className="hr-o-tim">
          <Icon ten="tim" kichCo={16} />
          <input className="hr-input" placeholder="Tìm theo tên đăng nhập, email, họ tên" value={tim} onChange={(e) => setTim(e.target.value)} aria-label="Tìm tài khoản" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={chiChuaGan} onChange={(e) => setChiChuaGan(e.target.checked)} /> Chỉ tài khoản chưa gắn hồ sơ
        </label>
        <span className="hr-gian" />
        <button type="button" className="hr-btn hr-btn-chinh" onClick={() => setModal({ loai: 'tao' })}>
          <Icon ten="them" kichCo={16} /> Tạo tài khoản
        </button>
      </div>

      <DataTable
        cotHienThi={cot}
        duLieu={duLieu}
        dangTai={dangTai}
        chonDuoc={false}
        khongCoDuLieu="Không có tài khoản nào"
        hanhDongThem={hanhDong}
        onLichSu={(d) => setLichSu(d)}
      />

      {modal && moForm()}
      {lichSu && <HistoryModal tenBang="TaiKhoan" banGhiId={lichSu.Id} tieuDe={`Lịch sử: ${nhanTaiKhoan(lichSu)}`} onDong={() => setLichSu(null)} />}
    </>
  );
}
