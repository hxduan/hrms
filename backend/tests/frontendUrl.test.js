const { layFrontendUrl } = require('../src/services/frontendUrl');

describe('layFrontendUrl', () => {
  test('uses the standalone server origin when serving the built frontend', () => {
    expect(layFrontendUrl({ cheDo: 'start', port: 3000 })).toBe('http://localhost:3000');
  });

  test('keeps the Vite origin for development', () => {
    expect(layFrontendUrl({ cheDo: 'dev', port: 3000 })).toBe('http://localhost:5173');
  });

  test('preserves an explicitly configured frontend URL', () => {
    expect(
      layFrontendUrl({
        cheDo: 'start',
        port: 3000,
        frontendUrl: 'https://hr.example.com/',
      }),
    ).toBe('https://hr.example.com');
  });

  test('uses the configured backend origin for a standalone deployment', () => {
    expect(
      layFrontendUrl({
        cheDo: 'start',
        port: 3000,
        backendUrl: 'https://hr.example.com/',
      }),
    ).toBe('https://hr.example.com');
  });
});
