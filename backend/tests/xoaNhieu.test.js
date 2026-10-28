const { xoaNhieuTheoLuot } = require('../src/services/xoaNhieu');

/** Giả lập cây phòng ban trong bộ nhớ: bị chặn nếu còn con chưa xóa. */
function taoCay(cha) {
  const daXoa = new Set();
  const kiemTra = async (id) => {
    if (!(id in cha)) return { ten: null, lyDo: 'Không tồn tại hoặc đã bị xóa' };
    const con = Object.keys(cha).filter((k) => cha[k] === Number(id) && !daXoa.has(Number(k)));
    return { ten: `PB${id}`, lyDo: con.length ? `còn ${con.length} phòng ban con` : null };
  };
  const xoa = async (id) => daXoa.add(id);
  return { daXoa, kiemTra, xoa };
}

describe('xoaNhieuTheoLuot', () => {
  test('chọn cả cha lẫn con (cha đứng trước): vẫn xóa được cả hai nhờ lặp nhiều lượt', async () => {
    const { daXoa, kiemTra, xoa } = taoCay({ 1: null, 2: 1, 3: 2 });
    const kq = await xoaNhieuTheoLuot([1, 2, 3], kiemTra, xoa);
    expect(kq.daXoa).toEqual([3, 2, 1]);
    expect(kq.khongXoaDuoc).toEqual([]);
    expect(daXoa.size).toBe(3);
  });

  test('chỉ chọn cha còn con KHÔNG được chọn: bị chặn và báo lý do', async () => {
    const { kiemTra, xoa } = taoCay({ 1: null, 2: 1 });
    const kq = await xoaNhieuTheoLuot([1], kiemTra, xoa);
    expect(kq.daXoa).toEqual([]);
    expect(kq.khongXoaDuoc).toEqual([{ id: 1, ten: 'PB1', lyDo: 'còn 1 phòng ban con' }]);
  });

  test('kết quả hỗn hợp: một phần xóa được, một phần bị chặn; id trùng chỉ xử lý một lần', async () => {
    const { kiemTra, xoa } = taoCay({ 1: null, 2: 1, 5: null });
    const kq = await xoaNhieuTheoLuot([1, 5, 5, 99], kiemTra, xoa);
    expect(kq.daXoa).toEqual([5]);
    expect(kq.khongXoaDuoc.map((x) => x.id).sort()).toEqual([1, 99]);
    expect(kq.khongXoaDuoc.find((x) => x.id === 99).lyDo).toMatch(/Không tồn tại/);
  });
});
