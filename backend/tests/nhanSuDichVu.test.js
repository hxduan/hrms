const { timChongLan, moTaKhoang } = require('../src/services/hopDongChongLan');
const { chuanHoaTinh, chuanHoaPhuongXa } = require('../src/services/diaChi');
const { docPhanTrang, docSapXep } = require('../src/services/phanTrang');
const { danhGiaDinhBien } = require('../src/services/dinhBien');

describe('timChongLan — hợp đồng không được chồng thời gian', () => {
  const ds = [
    { Id: 1, NgayBatDau: '2026-01-01', NgayKetThuc: '2026-03-31' },
    { Id: 2, NgayBatDau: '2026-04-01', NgayKetThuc: '2026-12-31' },
  ];
  const ids = (moi, tuyChon) => timChongLan(ds, moi, tuyChon).map((x) => x.Id);
  test('liền kề nhưng không chồng → hợp lệ', () => {
    expect(ids({ NgayBatDau: '2027-01-01', NgayKetThuc: null })).toEqual([]);
  });
  test('chạm đầu mút 1 ngày vẫn là chồng', () => {
    expect(ids({ NgayBatDau: '2026-03-31', NgayKetThuc: '2026-04-30' })).toEqual([1, 2]);
  });
  test('không thời hạn (kết thúc rỗng) chồng với mọi hợp đồng bắt đầu sau nó', () => {
    expect(ids({ NgayBatDau: '2025-06-01', NgayKetThuc: null })).toEqual([1, 2]);
  });
  test('hợp đồng cũ không thời hạn chặn mọi hợp đồng mới về sau', () => {
    const cu = [{ Id: 9, NgayBatDau: '2024-01-01', NgayKetThuc: null }];
    expect(timChongLan(cu, { NgayBatDau: '2030-01-01', NgayKetThuc: '2030-12-31' }).map((x) => x.Id)).toEqual([9]);
  });
  test('khi sửa, bỏ qua chính bản ghi đang sửa', () => {
    expect(ids({ NgayBatDau: '2026-01-01', NgayKetThuc: '2026-04-15' }, { boQuaId: 1 })).toEqual([2]);
  });
  test('dùng được với tên cột khác (phụ cấp)', () => {
    const pc = [{ Id: 5, NgayHieuLuc: '2026-01-01', NgayKetThuc: '2026-06-30' }];
    expect(timChongLan(pc, { NgayHieuLuc: '2026-06-30', NgayKetThuc: null }, { batDau: 'NgayHieuLuc' }).length).toBe(1);
    expect(moTaKhoang(pc[0], 'NgayHieuLuc')).toBe('2026-01-01 → 2026-06-30');
  });
});

describe('Chuẩn hóa danh mục địa chỉ', () => {
  test('tỉnh: mã thành chuỗi, sắp theo tên tiếng Việt, bỏ dòng thiếu dữ liệu', () => {
    const kq = chuanHoaTinh([{ code: 79, name: 'Thành phố Hồ Chí Minh' }, { code: 1, name: 'Thành phố Hà Nội' }, { code: 2 }, null]);
    expect(kq.map((x) => x.ma)).toEqual(['1', '79']);
    expect(kq[0]).toEqual({ ma: '1', ten: 'Thành phố Hà Nội' });
  });
  test('phường/xã: dạng mới (wards trực tiếp trong tỉnh)', () => {
    const kq = chuanHoaPhuongXa({ code: 1, wards: [{ code: 2, name: 'Phường B' }, { code: 1, name: 'Phường A' }] });
    expect(kq.map((x) => x.ten)).toEqual(['Phường A', 'Phường B']);
  });
  test('phường/xã: dạng cũ có districts[].wards vẫn gom được', () => {
    const kq = chuanHoaPhuongXa({ districts: [{ wards: [{ code: 1, name: 'A' }] }, { wards: [{ code: 2, name: 'B' }] }] });
    expect(kq.length).toBe(2);
  });
  test('API trả dạng cũ chỉ có quận/huyện (không có phường/xã) → báo lỗi rõ ràng, không im lặng', () => {
    let loi;
    try { chuanHoaPhuongXa({ districts: [{ code: 1, name: 'Quận 1' }] }); } catch (e) { loi = e; }
    expect(loi.status).toBe(502);
    expect(loi.message).toMatch(/cấu trúc cũ/);
  });
});

describe('Phân trang và sắp xếp', () => {
  test('giá trị mặc định, ép kiểu, chặn tối đa 200 dòng/trang', () => {
    expect(docPhanTrang({})).toEqual({ trang: 1, soDong: 20 });
    expect(docPhanTrang({ trang: '3', soDong: '50' })).toEqual({ trang: 3, soDong: 50 });
    expect(docPhanTrang({ trang: '-4', soDong: '99999' })).toEqual({ trang: 1, soDong: 200 });
    expect(docPhanTrang({ trang: 'abc', soDong: 'x' })).toEqual({ trang: 1, soDong: 20 });
  });
  test('sắp xếp chỉ nhận cột trong danh sách (chống chèn SQL)', () => {
    const cho = ['HoTen', 'NgayVaoLam'];
    expect(docSapXep({ sapXep: 'HoTen', huong: 'desc' }, cho, 'HoTen')).toEqual({ cot: 'HoTen', huong: 'DESC' });
    expect(docSapXep({ sapXep: 'HoTen; DROP TABLE NhanVien--' }, cho, 'HoTen').cot).toBe('HoTen');
    expect(docSapXep({ sapXep: 'MatKhau', huong: 'sideways' }, cho, 'NgayVaoLam')).toEqual({ cot: 'NgayVaoLam', huong: 'ASC' });
  });
});

describe('danhGiaDinhBien — thêm 1 người nữa có còn chỗ không', () => {
  test('chưa có định biên: cho phép nhưng cảnh báo', () => {
    const k = danhGiaDinhBien(null, 3);
    expect(k.duocPhep).toBe(true);
    expect(k.coDinhBien).toBe(false);
    expect(k.canhBao).toMatch(/chưa có định biên/);
  });
  test('còn chỗ', () => expect(danhGiaDinhBien(5, 4)).toEqual({ coDinhBien: true, duocPhep: true, soDuyet: 5, dangGiu: 4, conLai: 1 }));
  test('vừa đủ (4/4) → không thêm được nữa', () => {
    const k = danhGiaDinhBien(4, 4);
    expect(k.duocPhep).toBe(false);
    expect(k.canhBao).toMatch(/4\/4/);
  });
  test('đã vượt (5/4) vẫn là không được phép', () => expect(danhGiaDinhBien(4, 5).duocPhep).toBe(false));
  test('định biên 0 → không cho thêm', () => expect(danhGiaDinhBien(0, 0).duocPhep).toBe(false));
});
