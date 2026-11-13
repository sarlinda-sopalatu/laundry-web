/**
 * serve.js
 * Server statis tanpa dependency untuk menjalankan Laundry Kilat Web.
 *
 *   node serve.js
 *   PORT=3000 node serve.js
 *
 * Hanya digunakan untuk pengembangan/demo. Website tetap bisa dibuka
 * langsung lewat index.html tanpa server ini.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8090;
const HOST = '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch (e) {
    send(res, 400, 'Bad request');
    return;
  }

  const relative = pathname.replace(/^\/+/, '') || 'index.html';
  const filePath = path.join(ROOT, relative);

  // Cegah akses ke luar folder website.
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      send(res, 404, '404 — File tidak ditemukan');
      return;
    }

    const target = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;

    fs.readFile(target, (readError, data) => {
      if (readError) {
        send(res, 404, '404 — File tidak ditemukan');
        return;
      }
      const ext = path.extname(target).toLowerCase();
      send(res, 200, data, MIME_TYPES[ext] || 'application/octet-stream');
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  🧺  Laundry Kilat — Website');
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log('');
  console.log('  Tekan Ctrl+C untuk menghentikan server.');
  console.log('');
});
