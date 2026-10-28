import { useEffect, useId, useRef, useState } from 'react';
import Truong from './Truong';
import { ThongBao } from './ui';

const trong = (v) => v === '' || v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** Kiểm tra 1 ô ở phía trình duyệt. Trả về chuỗi lỗi hoặc null. Server vẫn kiểm tra lại. */
function kiemTraTruong(f, giaTri, tatCa) {
  if (trong(giaTri)) return f.batBuoc ? `${f.nhan} là bắt buộc` : null;
  const chuoi = String(giaTri);

  if (f.type === 'number') {
    const n = Number(giaTri);
    if (Number.isNaN(n)) return `${f.nhan} phải là số`;
    if (f.nguyen && !Number.isInteger(n)) return `${f.nhan} phải là số nguyên`;
    if (f.min !== undefined && n < f.min) return `${f.nhan} tối thiểu là ${f.min}`;
    if (f.max !== undefined && n > f.max) return `${f.nhan} tối đa là ${f.max}`;
  }
  if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chuoi.trim())) return 'Email không hợp lệ';
  if (f.doDaiToiThieu && chuoi.length < f.doDaiToiThieu) return `${f.nhan} tối thiểu ${f.doDaiToiThieu} ký tự`;
  if (f.mau && !f.mau.test(chuoi)) return f.thongBaoMau ?? `${f.nhan} không đúng định dạng`;
  return f.kiemTra ? f.kiemTra(giaTri, tatCa) ?? null : null;
}

/** Đổi giá trị trong state (toàn chuỗi) thành payload gửi lên API. */
function chuanHoa(cacTruong, giaTri) {
  const ra = {};
  for (const f of cacTruong) {
    if (f.khongGui) continue;
    const v = giaTri[f.key];
    if (f.type === 'number' || f.kieuSo) {
      ra[f.key] = trong(v) ? null : Number(v);
    } else if (typeof v === 'string') {
      const t = f.type === 'password' ? v : v.trim();
      ra[f.key] = t === '' && !f.batBuoc ? null : t;
    } else {
      ra[f.key] = v ?? null;
    }
  }
  return ra;
}

// Xuất để kiểm thử logic thuần (không cần dựng giao diện)
export { kiemTraTruong, chuanHoa };

/**
 * Props:
 *  cacTruong     mảng mô tả ô (xem Truong.jsx) + tuỳ chọn:
 *                  kiemTra(giaTri, tatCa)            -> chuỗi lỗi | null (đồng bộ)
 *                  kiemTraTrung(giaTri, tatCa)       -> Promise<chuỗi lỗi | null>, chạy khi rời ô
 *                  khongGui                          -> không đưa vào payload
 *  giaTriBanDau  object giá trị ban đầu (null/undefined -> '')
 *  onSubmit      async (payload) => {...}; ném lỗi axios để FormPanel tự hiển thị đúng ô
 */
export default function FormPanel({
  cacTruong,
  giaTriBanDau = {},
  onSubmit,
  nhanNop = 'Lưu',
  nhanHuy = 'Hủy',
  onHuy,
  khoiNop = false,
  phanPhu = null,
}) {
  const idGoc = useId();
  const [giaTri, setGiaTri] = useState(() =>
    Object.fromEntries(cacTruong.map((f) => [f.key, giaTriBanDau[f.key] ?? '']))
  );
  const [loi, setLoi] = useState({});
  const [loiTrung, setLoiTrung] = useState({});
  const [dangKiemTra, setDangKiemTra] = useState({});
  const [dangLuu, setDangLuu] = useState(false);
  const [loiChung, setLoiChung] = useState('');

  const giaTriRef = useRef(giaTri);
  giaTriRef.current = giaTri;
  const conGan = useRef(true);
  useEffect(() => () => void (conGan.current = false), []);

  const idO = (key) => `${idGoc}-${key}`;
  const focusO = (key) => document.getElementById(idO(key))?.focus();

  function doi(key, v) {
    setGiaTri((g) => ({ ...g, [key]: v }));
    setLoi((l) => (l[key] ? { ...l, [key]: null } : l));
    setLoiTrung((l) => (l[key] ? { ...l, [key]: null } : l));
  }

  async function roiO(f) {
    const v = giaTriRef.current[f.key];
    const loiDongBo = kiemTraTruong(f, v, giaTriRef.current);
    setLoi((l) => ({ ...l, [f.key]: loiDongBo }));
    if (loiDongBo || trong(v) || !f.kiemTraTrung) return;

    setDangKiemTra((d) => ({ ...d, [f.key]: true }));
    try {
      const msg = await f.kiemTraTrung(String(v).trim(), giaTriRef.current);
      // Bỏ kết quả nếu người dùng đã sửa tiếp trong lúc chờ
      if (conGan.current && giaTriRef.current[f.key] === v) setLoiTrung((l) => ({ ...l, [f.key]: msg ?? null }));
    } catch {
      /* Không chặn người dùng nếu API kiểm tra lỗi — server vẫn chặn khi lưu */
    } finally {
      if (conGan.current) setDangKiemTra((d) => ({ ...d, [f.key]: false }));
    }
  }

  function loiTuServer(err) {
    const d = err.response?.data;
    const cacKey = new Set(cacTruong.map((f) => f.key));
    if (err.response?.status === 400 && Array.isArray(d?.loi)) {
      const m = {};
      for (const x of d.loi) if (!m[x.truong]) m[x.truong] = x.ly_do;
      setLoi(m);
      const dau = cacTruong.find((f) => m[f.key]);
      if (dau) focusO(dau.key);
      else setLoiChung(d.message ?? 'Dữ liệu không hợp lệ');
    } else if (d?.truong && cacKey.has(d.truong)) {
      setLoi({ [d.truong]: d.message });
      focusO(d.truong);
    } else {
      setLoiChung(d?.message ?? 'Không thể lưu, vui lòng thử lại');
    }
  }

  async function nop(e) {
    e.preventDefault();
    if (dangLuu) return;
    setLoiChung('');

    const loiMoi = {};
    for (const f of cacTruong) {
      const m = kiemTraTruong(f, giaTri[f.key], giaTri);
      if (m) loiMoi[f.key] = m;
    }
    setLoi(loiMoi);
    const dauTien = cacTruong.find((f) => loiMoi[f.key] || loiTrung[f.key]);
    if (dauTien) return focusO(dauTien.key);

    setDangLuu(true);
    try {
      await onSubmit(chuanHoa(cacTruong, giaTri));
    } catch (err) {
      if (conGan.current) loiTuServer(err);
    } finally {
      if (conGan.current) setDangLuu(false);
    }
  }

  return (
    <form onSubmit={nop} noValidate>
      {loiChung && <ThongBao loai="loi">{loiChung}</ThongBao>}
      {cacTruong.map((f) => (
        <Truong
          key={f.key}
          id={idO(f.key)}
          truong={f}
          giaTri={giaTri[f.key]}
          loi={loi[f.key] || loiTrung[f.key]}
          dangKiemTra={dangKiemTra[f.key]}
          onDoi={(v) => doi(f.key, v)}
          onRoi={() => roiO(f)}
        />
      ))}
      {phanPhu}
      <div className="hr-modal-chan" style={khoiNop ? { display: 'block' } : undefined}>
        {onHuy && (
          <button type="button" className="hr-btn" onClick={onHuy} disabled={dangLuu}>
            {nhanHuy}
          </button>
        )}
        <button
          type="submit"
          className={`hr-btn hr-btn-chinh ${khoiNop ? 'hr-btn-khoi' : ''}`}
          disabled={dangLuu}
        >
          {dangLuu && <span className="hr-quay" aria-hidden="true" />}
          {dangLuu ? 'Đang xử lý...' : nhanNop}
        </button>
      </div>
    </form>
  );
}
