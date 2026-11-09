import { useEffect, useState } from 'react';
import api from '../api/client';

let boNhoTinh = null; // danh sách tỉnh chỉ tải 1 lần cho cả phiên

/**
 * Chọn địa chỉ 2 cấp: Tỉnh/Thành → Phường/Xã (mô hình mới từ 01/07/2025, không còn cấp quận/huyện).
 * Nếu API danh mục không gọi được, hoặc dữ liệu cũ chỉ có tên (không có mã) → tự chuyển sang NHẬP TAY để không chặn người dùng.
 *  giaTri: { MaTinh, Tinh, MaPhuongXa, PhuongXa }     onDoi(phanThayDoi)
 */
export default function DiaChiChon({ giaTri, onDoi, chiDoc = false }) {
  const [dsTinh, setDsTinh] = useState(boNhoTinh ?? []);
  const [dsPhuongXa, setDsPhuongXa] = useState([]);
  const [loiApi, setLoiApi] = useState(false);
  const [nhapTay, setNhapTay] = useState(!!(giaTri.Tinh && !giaTri.MaTinh));

  useEffect(() => {
    if (boNhoTinh) return undefined;
    let huy = false;
    api.get('/dia-chi/tinh')
      .then((r) => { boNhoTinh = r.data; if (!huy) setDsTinh(r.data); })
      .catch(() => !huy && setLoiApi(true));
    return () => { huy = true; };
  }, []);

  useEffect(() => {
    if (!giaTri.MaTinh || nhapTay) { setDsPhuongXa([]); return undefined; }
    let huy = false;
    api.get('/dia-chi/phuong-xa', { params: { maTinh: giaTri.MaTinh } })
      .then((r) => !huy && setDsPhuongXa(r.data))
      .catch(() => !huy && setLoiApi(true));
    return () => { huy = true; };
  }, [giaTri.MaTinh, nhapTay]);

  if (nhapTay || loiApi) {
    return (
      <div>
        <div className="hr-luoi-form" style={{ gap: '0 12px' }}>
          <input className="hr-input" placeholder="Tỉnh / Thành phố" value={giaTri.Tinh ?? ''} disabled={chiDoc} maxLength={100}
            onChange={(e) => onDoi({ Tinh: e.target.value, MaTinh: '', MaPhuongXa: '' })} aria-label="Tỉnh / Thành phố" />
          <input className="hr-input" placeholder="Phường / Xã" value={giaTri.PhuongXa ?? ''} disabled={chiDoc} maxLength={100}
            onChange={(e) => onDoi({ PhuongXa: e.target.value, MaPhuongXa: '' })} aria-label="Phường / Xã" />
        </div>
        <div className="hr-goi-y" style={{ marginTop: 6 }}>
          {loiApi ? 'Không tải được danh mục địa chỉ — đang ở chế độ nhập tay. ' : ''}
          {!loiApi && !chiDoc && (
            <button type="button" className="hr-sx" style={{ color: 'var(--chinh)' }} onClick={() => setNhapTay(false)}>Chọn từ danh mục</button>
          )}
        </div>
      </div>
    );
  }

  const doiTinh = (ma) => {
    const t = dsTinh.find((x) => x.ma === ma);
    onDoi({ MaTinh: ma, Tinh: t?.ten ?? '', MaPhuongXa: '', PhuongXa: '' });
  };
  const doiPhuongXa = (ma) => {
    const p = dsPhuongXa.find((x) => x.ma === ma);
    onDoi({ MaPhuongXa: ma, PhuongXa: p?.ten ?? '' });
  };
  const coPhuongHienTai = giaTri.MaPhuongXa && !dsPhuongXa.some((p) => p.ma === giaTri.MaPhuongXa);

  return (
    <div>
      <div className="hr-luoi-form" style={{ gap: '0 12px' }}>
        <select className="hr-select" value={giaTri.MaTinh ?? ''} disabled={chiDoc} onChange={(e) => doiTinh(e.target.value)} aria-label="Tỉnh / Thành phố">
          <option value="">— Tỉnh / Thành phố —</option>
          {dsTinh.map((t) => (<option key={t.ma} value={t.ma}>{t.ten}</option>))}
        </select>
        <select className="hr-select" value={giaTri.MaPhuongXa ?? ''} disabled={chiDoc || !giaTri.MaTinh} onChange={(e) => doiPhuongXa(e.target.value)} aria-label="Phường / Xã">
          <option value="">{giaTri.MaTinh ? '— Phường / Xã —' : 'Chọn tỉnh trước'}</option>
          {coPhuongHienTai && <option value={giaTri.MaPhuongXa}>{giaTri.PhuongXa}</option>}
          {dsPhuongXa.map((p) => (<option key={p.ma} value={p.ma}>{p.ten}</option>))}
        </select>
      </div>
      {!chiDoc && (
        <div className="hr-goi-y" style={{ marginTop: 6 }}>
          <button type="button" className="hr-sx" style={{ color: 'var(--chinh)' }} onClick={() => setNhapTay(true)}>Nhập tay</button>
        </div>
      )}
    </div>
  );
}
