const { z } = require('zod');
const { rongThanhNull, idTuyChon, idBatBuoc } = require('./chung');

const thuTu = z.coerce.number().int('Thứ tự phải là số nguyên').min(0, 'Thứ tự từ 0').max(9999, 'Thứ tự tối đa 9999').default(0);

const PhongBanSchema = z.object({
  Ten: z.string({ required_error: 'Bắt buộc nhập tên phòng ban' }).trim().min(1, 'Bắt buộc nhập tên phòng ban').max(200, 'Tên tối đa 200 ký tự'),
  MaPhongBan: z.preprocess(
    rongThanhNull,
    z.string().trim().max(30, 'Mã tối đa 30 ký tự').regex(/^[A-Za-z0-9_.-]+$/, 'Mã chỉ gồm chữ không dấu, số và . _ -').nullable()
  ).optional().transform((v) => v ?? null),
  PhongBanChaId: idTuyChon.optional().transform((v) => v ?? null),
  ThuTu: thuTu,
});

const ChucVuSchema = z.object({
  Ten: z.string({ required_error: 'Bắt buộc nhập tên chức vụ' }).trim().min(1, 'Bắt buộc nhập tên chức vụ').max(200, 'Tên tối đa 200 ký tự'),
  PhongBanId: idTuyChon.optional().transform((v) => v ?? null),
  ThuTu: thuTu,
});

const ChucDanhSchema = z.object({
  Ten: z.string({ required_error: 'Bắt buộc nhập tên chức danh' }).trim().min(1, 'Bắt buộc nhập tên chức danh').max(200, 'Tên tối đa 200 ký tự'),
});

const soLuong = z.coerce
  .number({ invalid_type_error: 'Số lượng phải là số' })
  .int('Số lượng phải là số nguyên')
  .min(0, 'Số lượng không được âm')
  .max(100000, 'Số lượng quá lớn');

const ghiChu = z.preprocess(rongThanhNull, z.string().trim().max(300, 'Ghi chú tối đa 300 ký tự').nullable()).optional().transform((v) => v ?? null);

const DinhBienTaoSchema = z.object({
  PhongBanId: idBatBuoc('Bắt buộc chọn phòng ban'),
  ChucDanhId: idBatBuoc('Bắt buộc chọn chức danh'),
  Nam: z.coerce.number({ invalid_type_error: 'Năm không hợp lệ' }).int('Năm không hợp lệ').min(2000, 'Năm từ 2000').max(2100, 'Năm tối đa 2100'),
  SoLuongDuocDuyet: soLuong,
  GhiChu: ghiChu,
});

// Khi sửa chỉ cho đổi số lượng + ghi chú. Đổi phòng ban/chức danh/năm = 1 định biên khác.
const DinhBienSuaSchema = z.object({
  SoLuongDuocDuyet: soLuong,
  GhiChu: ghiChu,
});

module.exports = { PhongBanSchema, ChucVuSchema, ChucDanhSchema, DinhBienTaoSchema, DinhBienSuaSchema };
