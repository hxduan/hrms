/** Thanh phân trang cho danh sách phân trang phía máy chủ. */
export default function PhanTrang({ trang, soDong, tongSo, onDoiTrang, onDoiSoDong, cacSoDong = [10, 20, 50, 100] }) {
  const tongTrang = Math.max(1, Math.ceil(tongSo / soDong));
  const tu = tongSo === 0 ? 0 : (trang - 1) * soDong + 1;
  const den = Math.min(trang * soDong, tongSo);

  // Cửa sổ trang quanh trang hiện tại: 1 … 4 5 [6] 7 8 … 20
  const trangHienThi = [];
  for (let p = 1; p <= tongTrang; p++) {
    if (p === 1 || p === tongTrang || Math.abs(p - trang) <= 2) trangHienThi.push(p);
    else if (trangHienThi[trangHienThi.length - 1] !== '…') trangHienThi.push('…');
  }

  return (
    <div className="hr-phan-trang" role="navigation" aria-label="Phân trang">
      <span className="hr-goi-y">{tongSo === 0 ? 'Không có kết quả' : `Hiển thị ${tu}–${den} / ${tongSo}`}</span>
      <span className="hr-gian" />
      {onDoiSoDong && (
        <select className="hr-select hr-select-nho" value={soDong} onChange={(e) => onDoiSoDong(Number(e.target.value))} aria-label="Số dòng mỗi trang">
          {cacSoDong.map((n) => (
            <option key={n} value={n}>{n} dòng/trang</option>
          ))}
        </select>
      )}
      <button type="button" className="hr-btn hr-btn-nho" disabled={trang <= 1} onClick={() => onDoiTrang(trang - 1)}>‹ Trước</button>
      {trangHienThi.map((p, i) =>
        p === '…' ? (
          <span key={`d${i}`} className="hr-goi-y">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`hr-btn hr-btn-nho ${p === trang ? 'hr-btn-chinh' : ''}`}
            aria-current={p === trang ? 'page' : undefined}
            onClick={() => onDoiTrang(p)}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className="hr-btn hr-btn-nho" disabled={trang >= tongTrang} onClick={() => onDoiTrang(trang + 1)}>Sau ›</button>
    </div>
  );
}
