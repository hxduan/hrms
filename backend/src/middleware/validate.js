/** Dùng: router.post('/x', validate(SomeZodSchema), handler) */
function validate(schema) {
  return (req, res, next) => {
    const ketQua = schema.safeParse(req.body);
    if (!ketQua.success) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        loi: ketQua.error.issues.map((i) => ({ truong: i.path.join('.'), ly_do: i.message })),
      });
    }
    req.body = ketQua.data;
    next();
  };
}

module.exports = { validate };
