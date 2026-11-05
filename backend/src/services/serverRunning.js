const http = require('http');

function guiYeuCau(port, path, timeout) {
  return new Promise((resolve) => {
    const request = http.get(
      { hostname: '127.0.0.1', port, path, timeout },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({ statusCode: response.statusCode, headers: response.headers, body });
        });
        response.on('error', () => resolve(null));
      },
    );

    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(null));
  });
}

function laJson(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}

async function kiemTraServerHRMS(port, timeout = 1500) {
  const health = await guiYeuCau(port, '/health', timeout);
  if (health?.statusCode !== 200 || laJson(health)?.status !== 'ok') return false;
  if (health.headers['x-hrms-service'] === 'hrms') return true;

  const auth = await guiYeuCau(port, '/auth/me', timeout);
  return auth?.statusCode === 401 && laJson(auth)?.message === 'Chưa đăng nhập';
}

module.exports = { kiemTraServerHRMS };
