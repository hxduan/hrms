const request = require('supertest');
const app = require('../src/app');
const passport = require('../src/config/passport');

const googleOAuthCoCauHinh = passport.daCauHinhGoogle;
const backendUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

(googleOAuthCoCauHinh ? describe : describe.skip)('Google OAuth redirect URLs', () => {
  test('uses the backend callback URL registered with Google', async () => {
    const response = await request(app).get('/auth/google').redirects(0);
    const authorizationUrl = new URL(response.headers.location);

    expect(response.status).toBe(302);
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      `${backendUrl}/auth/google/callback`
    );
  });

  test('returns OAuth failures to the configured frontend instead of an undefined URL', async () => {
    const response = await request(app)
      .get('/auth/google/callback?error=access_denied')
      .redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${frontendUrl}/dang-nhap?loi=google`);
  });
});
