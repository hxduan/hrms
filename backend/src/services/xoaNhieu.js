/**
 * Xóa nhiều bản ghi theo từng "lượt". Vì có thể chọn cả cha lẫn con cùng lúc
 * (VD phòng ban), một bản ghi bị chặn ở lượt này có thể được phép xóa ở lượt
 * sau khi con của nó đã bị xóa. Lặp tới khi không còn tiến triển.
 *
 * Hàm THUẦN (không đụng DB) để test được — phần DB truyền vào qua 2 callback:
 *   kiemTra(id) -> { ten, lyDo }   lyDo = null nghĩa là được phép xóa
 *   xoa(id)     -> Promise<void>
 */
async function xoaNhieuTheoLuot(ids, kiemTra, xoa) {
  let conLai = [...new Set(ids)];
  const daXoa = [];
  const lyDoCuoi = new Map();
  let coTienTrien = true;

  while (conLai.length > 0 && coTienTrien) {
    coTienTrien = false;
    const luotSau = [];
    for (const id of conLai) {
      const kq = await kiemTra(id);
      if (kq.lyDo === null) {
        await xoa(id);
        daXoa.push(id);
        coTienTrien = true;
      } else {
        lyDoCuoi.set(id, { id, ten: kq.ten, lyDo: kq.lyDo });
        luotSau.push(id);
      }
    }
    conLai = luotSau;
  }

  return { daXoa, khongXoaDuoc: conLai.map((id) => lyDoCuoi.get(id)) };
}

module.exports = { xoaNhieuTheoLuot };
