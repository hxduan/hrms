import { defineConfig } from 'vite';

const apiRoutes = [
  '/auth',
  '/health',
  '/phong-ban',
  '/chuc-vu',
  '/chuc-danh',
  '/dinh-bien',
  '/tai-khoan',
  '/nhat-ky-thay-doi',
];

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(apiRoutes.map((route) => [route, 'http://localhost:3000'])),
  },
});
