const request = require('supertest');
const app = require('../src/app');
const { xacDinhNhanVien } = require('../src/routes/nhanVienTab');

describe('Nhân sự routes', () => {
  test.each([
    '/nhan-vien',
    '/nhan-vien/toi',
    '/nhan-vien/1/hop-dong',
    '/nhan-vien/1/nghi-viec',
    '/hop-dong/sap-het-han',
    '/dia-chi/tinh',
    '/danh-muc-nhan-su/loai-hop-dong',
  ])('%s is registered and requires authentication', async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Chưa đăng nhập');
  });

  test('an employee cannot read another employee profile', async () => {
    const req = {
      params: { nhanVienId: '8' },
      user: { role: 'nhan_vien', employeeId: 7 },
    };

    await expect(
      xacDinhNhanVien(req, {}, { chiDoc: true }),
    ).rejects.toMatchObject({ status: 403 });
  });

  test('an employee can read their own profile', async () => {
    const pool = {
      request: () => ({
        input() {
          return this;
        },
        async query() {
          return { recordset: [{ x: 1 }] };
        },
      }),
    };

    await expect(
      xacDinhNhanVien(
        { params: { nhanVienId: '7' }, user: { role: 'nhan_vien', employeeId: 7 } },
        pool,
        { chiDoc: true },
      ),
    ).resolves.toBe(7);
  });
});
