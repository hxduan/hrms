function boDauGachCuoi(url) {
  return url.replace(/\/+$/, '');
}

function layFrontendUrl({
  cheDo,
  port = 3000,
  frontendUrl,
  backendUrl,
} = {}) {
  if (frontendUrl?.trim()) return boDauGachCuoi(frontendUrl.trim());
  if (cheDo === 'start') {
    return boDauGachCuoi(backendUrl?.trim() || `http://localhost:${port}`);
  }
  return 'http://localhost:5173';
}

module.exports = { layFrontendUrl };
