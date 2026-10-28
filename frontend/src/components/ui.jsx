import Icon from './Icon';

/** Tiêu đề trang: tiêu đề + mô tả bên trái, các nút hành động bên phải. */
export function TieuDeTrang({ tieuDe, moTa, children }) {
  return (
    <div className="hr-tieu-de-trang">
      <div>
        <h1>{tieuDe}</h1>
        {moTa && <p>{moTa}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}

/** Hộp thông báo trong trang. loai: loi | vang | ok | thongTin */
export function ThongBao({ loai = 'thongTin', children }) {
  const lop = { loi: 'loi', vang: 'vang', ok: 'ok', thongTin: 'thong-tin' }[loai];
  const icon = { loi: 'canhBao', vang: 'canhBao', ok: 'tich', thongTin: 'thongTin' }[loai];
  return (
    <div className={`hr-canh-bao hr-canh-bao-${lop}`} role={loai === 'loi' ? 'alert' : 'status'}>
      <Icon ten={icon} kichCo={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>{children}</div>
    </div>
  );
}

export function HuyHieu({ loai, children }) {
  return <span className={`hr-huy-hieu ${loai ? `hr-hh-${loai}` : ''}`}>{children}</span>;
}

export function Quay() {
  return <span className="hr-quay" role="status" aria-label="Đang tải" />;
}

export function ManHinhTai({ noiDung = 'Đang tải...' }) {
  return (
    <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', color: 'var(--chu-phu)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Quay /> {noiDung}
      </div>
    </div>
  );
}
