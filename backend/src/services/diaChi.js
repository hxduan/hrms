const { loiNghiepVu } = require('./loi');

/**
 * Danh mục địa chỉ Việt Nam theo mô hình 2 cấp (tỉnh/thành -> phường/xã) áp dụng từ 01/07/2025.
 * Nguồn mặc định: provinces.open-api.vn (API phiên bản mới). Đổi bằng biến môi trường DIA_CHI_API_URL.
 * Chạy `node scripts/kiemTraApiDiaChi.js` để xem đúng cấu trúc dữ liệu API đang trả về.
 * Các hàm chuẩn hóa (thuần, có test) chấp nhận nhiều dạng: `wards` trong tỉnh, hoặc `districts[].wards` (dạng cũ).
 */
const GOC = () => (process.env.DIA_CHI_API_URL || 'https://provinces.open-api.vn/api/v2').replace(/\/+$/, '');
const TTL_MS = 24 * 60 * 60 * 1000;
const bo_nho = new Map();
const dangGoi = new Map();

const sapTheoTen = (ds) => ds.sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));

function chuanHoaTinh(raw) {
  const mang = Array.isArray(raw) ? raw : raw?.results ?? [];
  return sapTheoTen(mang.filter((x) => x && x.code != null && x.name).map((x) => ({ ma: String(x.code), ten: String(x.name) })));
}

function chuanHoaPhuongXa(raw) {
  if (Array.isArray(raw?.wards)) {
    return sapTheoTen(raw.wards.filter((w) => w.code != null && w.name).map((w) => ({ ma: String(w.code), ten: String(w.name) })));
  }
  if (Array.isArray(raw?.districts)) {
    const dsPhuong = raw.districts.flatMap((d) => (Array.isArray(d.wards) ? d.wards : []));
    if (dsPhuong.length) return sapTheoTen(dsPhuong.map((w) => ({ ma: String(w.code), ten: String(w.name) })));
    throw loiNghiepVu(502, 'API địa chỉ đang trả cấu trúc cũ (có quận/huyện). Hãy đặt DIA_CHI_API_URL sang phiên bản mới (api/v2).');
  }
  return [];
}

async function goiApi(duongDan) {
  const dieuKhien = new AbortController();
  const hen = setTimeout(() => dieuKhien.abort(), 8000);
  try {
    const res = await fetch(`${GOC()}${duongDan}`, { signal: dieuKhien.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    throw loiNghiepVu(502, `Không tải được danh mục địa chỉ (${err.message}). Bạn có thể nhập tay tỉnh/phường xã.`);
  } finally {
    clearTimeout(hen);
  }
}

async function coBoNho(khoa, taoGiaTri) {
  const co = bo_nho.get(khoa);
  if (co && co.het > Date.now()) return co.giaTri;
  if (dangGoi.has(khoa)) return dangGoi.get(khoa);
  const p = taoGiaTri()
    .then((giaTri) => { bo_nho.set(khoa, { het: Date.now() + TTL_MS, giaTri }); return giaTri; })
    .finally(() => dangGoi.delete(khoa));
  dangGoi.set(khoa, p);
  return p;
}

const layTinh = () => coBoNho('tinh', async () => chuanHoaTinh(await goiApi('/p/')));

async function layPhuongXa(maTinh) {
  if (!/^\d{1,4}$/.test(String(maTinh))) throw loiNghiepVu(400, 'Mã tỉnh không hợp lệ');
  return coBoNho(`px:${maTinh}`, async () => {
    const raw = await goiApi(`/p/${maTinh}?depth=2`);
    let ds = chuanHoaPhuongXa(raw);
    if (ds.length === 0) ds = chuanHoaPhuongXa({ wards: (await goiApi(`/w/?province=${maTinh}`)).results ?? [] });
    return ds;
  });
}

const xoaBoNho = () => { bo_nho.clear(); dangGoi.clear(); };

module.exports = { layTinh, layPhuongXa, chuanHoaTinh, chuanHoaPhuongXa, xoaBoNho };
