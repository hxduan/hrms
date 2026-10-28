const { z } = require('zod');

/** Chuỗi rỗng / undefined -> null (dùng cho ô tùy chọn trên form). */
const rongThanhNull = (v) => (v === undefined || v === '' || (typeof v === 'string' && v.trim() === '') ? null : v);

/** Id tùy chọn: '' | null | undefined -> null, còn lại phải là số nguyên dương. */
const idTuyChon = z.preprocess(rongThanhNull, z.coerce.number().int().positive().nullable());

/** Id bắt buộc. Không dùng coerce trực tiếp để '' không bị biến thành 0. */
const idBatBuoc = (thongBao) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number({ required_error: thongBao, invalid_type_error: thongBao }).int(thongBao).positive(thongBao)
  );

const XoaNhieuSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, 'Chưa chọn mục nào').max(200, 'Tối đa 200 mục mỗi lần'),
});

module.exports = { rongThanhNull, idTuyChon, idBatBuoc, XoaNhieuSchema };
