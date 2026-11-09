const { z } = require('zod');
const { rongThanhNull, idTuyChon, idBatBuoc } = require('./chung');

// ---------------------------------------------------------------------------
// Tiện ích ngày (chuỗi YYYY-MM-DD, không dùng Date để khỏi lệch múi giờ)
// ---------------------------------------------------------------------------
function ngayHopLe(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Cộng `n` năm vào ngày YYYY-MM-DD (29/02 cộng sang năm không nhuận -> 01/03). */
function congNam(ngay, n) {
  const [y, m, d] = ngay.split('-').map(Number);
  return new Date(Date.UTC(y + n, m - 1, d)).toISOString().slice(0, 10);
}

const homNayYMD = () => new Date().toISOString().slice(0, 10);

/** Đủ `tuoiToiThieu` tuổi tại ngày `ngayMoc`? (VD đủ 15 tuổi tại ngày vào làm) */
function duTuoiTai(ngaySinh, ngayMoc, tuoiToiThieu = 15) {
  return congNam(ngaySinh, tuoiToiThieu) <= ngayMoc;
}

const THONG_BAO_NGAY = 'Ngày không hợp lệ (định dạng YYYY-MM-DD)';
const ngay = (tb = THONG_BAO_NGAY) =>
  z.string({ required_error: tb, invalid_type_error: tb }).trim().refine(ngayHopLe, tb);
const ngayTuyChon = () =>
  z.preprocess(rongThanhNull, ngay().nullable()).optional().transform((v) => v ?? null);

const chuoiTuyChon = (max, tb) =>
  z
    .preprocess(rongThanhNull, z.string().trim().max(max, tb ?? `Tối đa ${max} ký tự`).nullable())
    .optional()
    .transform((v) => v ?? null);

const mau = (re, tb, max) =>
  z
    .preprocess(rongThanhNull, z.string().trim().max(max ?? 100).regex(re, tb).nullable())
    .optional()
    .transform((v) => v ?? null);

const tien = (tb = 'Số tiền không hợp lệ') =>
  z.coerce.number({ invalid_type_error: tb }).positive('Số tiền phải lớn hơn 0').max(1e11, 'Số tiền quá lớn');
const tienTuyChon = () =>
  z.preprocess(rongThanhNull, tien().nullable()).optional().transform((v) => v ?? null);

const boolean = (macDinh = false) =>
  z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean()).optional().default(macDinh);

// ---------------------------------------------------------------------------
// Hồ sơ nhân viên
// ---------------------------------------------------------------------------
const RE_CCCD = /^\d{12}$/;
const RE_SDT = /^(0|\+84)\d{9}$/;
const RE_BHXH = /^\d{10}$/;
const RE_MST = /^\d{10}(-?\d{3})?$/;

// Các trường dùng chung cho tạo mới và sửa. Vị trí công tác (phòng ban / chức vụ / chức danh) KHÔNG nằm ở đây
// khi sửa: muốn đổi phải ghi vào tab "Quá trình công tác" để có lịch sử và kiểm tra định biên.
const truongChung = {
  HoTen: z.string({ required_error: 'Bắt buộc nhập họ tên' }).trim().min(1, 'Bắt buộc nhập họ tên').max(200, 'Họ tên tối đa 200 ký tự'),
  GioiTinh: z.preprocess(rongThanhNull, z.enum(['Nam', 'Nữ', 'Khác'], { errorMap: () => ({ message: 'Giới tính không hợp lệ' }) }).nullable()).optional().transform((v) => v ?? null),
  NgaySinh: ngayTuyChon(),
  SoCCCD: mau(RE_CCCD, 'Số CCCD gồm đúng 12 chữ số', 20),
  SoDienThoai: mau(RE_SDT, 'Số điện thoại không hợp lệ (VD 0912345678)', 20),
  Email: z.preprocess(rongThanhNull, z.string().trim().toLowerCase().max(255).email('Email không hợp lệ').nullable()).optional().transform((v) => v ?? null),
  Tinh: chuoiTuyChon(100),
  MaTinh: chuoiTuyChon(10),
  PhuongXa: chuoiTuyChon(100),
  MaPhuongXa: chuoiTuyChon(10),
  DiaChiChiTiet: chuoiTuyChon(300),
  NgayVaoLam: ngay('Bắt buộc nhập ngày vào làm (YYYY-MM-DD)'),
  SoSoBHXH: mau(RE_BHXH, 'Số sổ BHXH gồm đúng 10 chữ số', 15),
  MaSoThue: mau(RE_MST, 'Mã số thuế gồm 10 hoặc 13 chữ số', 15),
  VungLuong: z.coerce.number().int('Vùng lương phải là 1–4').min(1, 'Vùng lương từ 1 đến 4').max(4, 'Vùng lương từ 1 đến 4').default(1),
  TenNganHang: chuoiTuyChon(200),
  SoTaiKhoanNganHang: mau(/^\d{6,20}$/, 'Số tài khoản gồm 6–20 chữ số', 50),
};

function kiemTraNgayHoSo(d, ctx) {
  if (d.NgaySinh) {
    if (d.NgaySinh > homNayYMD()) {
      ctx.addIssue({ code: 'custom', path: ['NgaySinh'], message: 'Ngày sinh không được ở tương lai' });
    } else if (!duTuoiTai(d.NgaySinh, d.NgayVaoLam, 15)) {
      ctx.addIssue({ code: 'custom', path: ['NgayVaoLam'], message: 'Nhân viên phải đủ 15 tuổi tại ngày vào làm' });
    }
  }
}

const NhanVienSchema = z
  .object({
    ...truongChung,
    PhongBanId: idBatBuoc('Bắt buộc chọn phòng ban'),
    ChucVuId: idTuyChon.optional().transform((v) => v ?? null),
    ChucDanhId: idBatBuoc('Bắt buộc chọn chức danh'),
    // Khi vị trí đã hết định biên, HR phải xác nhận kèm lý do thì mới được tạo
    xacNhanVuotDinhBien: boolean(false),
    lyDoVuotDinhBien: chuoiTuyChon(300),
  })
  .superRefine((d, ctx) => {
    kiemTraNgayHoSo(d, ctx);
    if (d.xacNhanVuotDinhBien && !d.lyDoVuotDinhBien) {
      ctx.addIssue({ code: 'custom', path: ['lyDoVuotDinhBien'], message: 'Bắt buộc nhập lý do khi vượt định biên' });
    }
  });

const NhanVienSuaSchema = z.object(truongChung).superRefine(kiemTraNgayHoSo);

// ---------------------------------------------------------------------------
// Hợp đồng
// ---------------------------------------------------------------------------
const HopDongSchema = z
  .object({
    LoaiHopDongId: idBatBuoc('Bắt buộc chọn loại hợp đồng'),
    SoHopDong: chuoiTuyChon(50),
    NgayBatDau: ngay('Bắt buộc nhập ngày bắt đầu'),
    NgayKetThuc: ngayTuyChon(),
    LuongCoBan: tien('Lương cơ bản không hợp lệ'),
    LuongDongBHXH: tienTuyChon(),
    GhiChu: chuoiTuyChon(300),
  })
  .superRefine((d, ctx) => {
    if (d.NgayKetThuc && d.NgayKetThuc < d.NgayBatDau) {
      ctx.addIssue({ code: 'custom', path: ['NgayKetThuc'], message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu' });
    }
  });

// ---------------------------------------------------------------------------
// Quá trình công tác (bổ nhiệm, điều chuyển...)
// ---------------------------------------------------------------------------
const LOAI_BIEN_DONG = ['bo_nhiem', 'dieu_chuyen', 'thang_chuc', 'giang_chuc', 'khac'];

const QuaTrinhSchema = z
  .object({
    LoaiBienDong: z.enum(LOAI_BIEN_DONG, { errorMap: () => ({ message: 'Loại biến động không hợp lệ' }) }),
    NgayHieuLuc: ngay('Bắt buộc nhập ngày hiệu lực'),
    PhongBanId: idBatBuoc('Bắt buộc chọn phòng ban'),
    ChucVuId: idTuyChon.optional().transform((v) => v ?? null),
    ChucDanhId: idBatBuoc('Bắt buộc chọn chức danh'),
    SoQuyetDinh: chuoiTuyChon(50),
    GhiChu: chuoiTuyChon(300),
    xacNhanVuotDinhBien: boolean(false),
    lyDoVuotDinhBien: chuoiTuyChon(300),
  })
  .superRefine((d, ctx) => {
    if (d.xacNhanVuotDinhBien && !d.lyDoVuotDinhBien) {
      ctx.addIssue({ code: 'custom', path: ['lyDoVuotDinhBien'], message: 'Bắt buộc nhập lý do khi vượt định biên' });
    }
  });

// ---------------------------------------------------------------------------
// Nghỉ việc
// ---------------------------------------------------------------------------
const NghiViecSchema = z
  .object({
    LyDoNghiViecId: idBatBuoc('Bắt buộc chọn lý do nghỉ việc'),
    NgayNghiViec: ngay('Bắt buộc nhập ngày nghỉ việc'),
    NgayLamViecCuoi: ngayTuyChon(),
    GhiChu: chuoiTuyChon(300),
    KhoaTaiKhoan: boolean(true),
  })
  .superRefine((d, ctx) => {
    if (d.NgayLamViecCuoi && d.NgayLamViecCuoi > d.NgayNghiViec) {
      ctx.addIssue({ code: 'custom', path: ['NgayLamViecCuoi'], message: 'Ngày làm việc cuối không được sau ngày nghỉ việc' });
    }
  });

const HuyNghiViecSchema = z.object({
  lyDo: z.string({ required_error: 'Bắt buộc nhập lý do hủy' }).trim().min(1, 'Bắt buộc nhập lý do hủy').max(300),
});

// ---------------------------------------------------------------------------
// Phụ cấp và người phụ thuộc (đầu vào của tính lương)
// ---------------------------------------------------------------------------
const PhuCapSchema = z
  .object({
    TenPhuCap: z.string({ required_error: 'Bắt buộc nhập tên phụ cấp' }).trim().min(1, 'Bắt buộc nhập tên phụ cấp').max(200),
    SoTien: tien('Số tiền không hợp lệ'),
    TinhBHXH: boolean(false),
    TinhThue: boolean(true),
    // NULL = không miễn; số = phần được miễn thuế tối đa mỗi tháng (VD tiền ăn)
    MienThueToiDa: z.preprocess(rongThanhNull, z.coerce.number().min(0, 'Không được âm').max(1e11).nullable()).optional().transform((v) => v ?? null),
    NgayHieuLuc: ngay('Bắt buộc nhập ngày hiệu lực'),
    NgayKetThuc: ngayTuyChon(),
  })
  .superRefine((d, ctx) => {
    if (d.NgayKetThuc && d.NgayKetThuc < d.NgayHieuLuc) {
      ctx.addIssue({ code: 'custom', path: ['NgayKetThuc'], message: 'Ngày kết thúc phải sau hoặc bằng ngày hiệu lực' });
    }
  });

const NguoiPhuThuocSchema = z
  .object({
    HoTen: z.string({ required_error: 'Bắt buộc nhập họ tên' }).trim().min(1, 'Bắt buộc nhập họ tên').max(200),
    QuanHe: chuoiTuyChon(50),
    NgaySinh: ngayTuyChon(),
    MaSoThue: mau(RE_MST, 'Mã số thuế gồm 10 hoặc 13 chữ số', 15),
    SoCCCD: mau(/^\d{9}$|^\d{12}$/, 'Số CCCD/CMND gồm 9 hoặc 12 chữ số', 20),
    NgayBatDauTinhGiamTru: ngay('Bắt buộc nhập ngày bắt đầu tính giảm trừ'),
    NgayKetThucTinhGiamTru: ngayTuyChon(),
  })
  .superRefine((d, ctx) => {
    if (d.NgayKetThucTinhGiamTru && d.NgayKetThucTinhGiamTru < d.NgayBatDauTinhGiamTru) {
      ctx.addIssue({ code: 'custom', path: ['NgayKetThucTinhGiamTru'], message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu' });
    }
  });

// ---------------------------------------------------------------------------
// Danh mục dùng cho Nhân sự (quản lý ở Quản trị -> Danh mục)
// ---------------------------------------------------------------------------
const tenDanhMuc = z.string({ required_error: 'Bắt buộc nhập tên' }).trim().min(1, 'Bắt buộc nhập tên').max(200, 'Tên tối đa 200 ký tự');
const LoaiHopDongSchema = z.object({
  Ten: tenDanhMuc,
  CoDongBaoHiem: boolean(true),
  KieuTinhThue: z.enum(['luy_tien', 'khau_tru_10'], { errorMap: () => ({ message: 'Cách tính thuế không hợp lệ' }) }).default('luy_tien'),
});
const LyDoNghiViecSchema = z.object({ Ten: tenDanhMuc });

module.exports = {
  ngayHopLe, congNam, homNayYMD, duTuoiTai,
  NhanVienSchema, NhanVienSuaSchema, HopDongSchema, QuaTrinhSchema, NghiViecSchema, HuyNghiViecSchema,
  PhuCapSchema, NguoiPhuThuocSchema, LoaiHopDongSchema, LyDoNghiViecSchema, LOAI_BIEN_DONG,
};
