import { defineConfig } from 'vite';

// Proxy /auth và /health sang backend khi dev ở cổng 5173 —
// nhờ đó frontend gọi API bằng URL tương đối, không hardcode localhost:3000.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
