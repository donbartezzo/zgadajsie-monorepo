const fs = require('fs');
const path = require('path');

// Load root .env.local without external dependencies
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) {
        const value = rest.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) process.env[key.trim()] = value;
      }
    });
}

const backendPort = process.env.PORT || 3000;
const backendTarget = `http://localhost:${backendPort}`;

module.exports = {
  '/api': {
    target: backendTarget,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  '/socket.io': {
    target: backendTarget,
    secure: false,
    changeOrigin: true,
    ws: true,
  },
};
