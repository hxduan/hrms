require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { layFrontendUrl } = require('./src/services/frontendUrl');

process.env.FRONTEND_URL = layFrontendUrl({
  cheDo: 'start',
  port: Number(process.env.PORT) || 3000,
  frontendUrl: process.env.FRONTEND_URL,
  backendUrl: process.env.BACKEND_URL,
});

require('./server');
