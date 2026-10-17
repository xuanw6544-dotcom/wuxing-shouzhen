const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'www');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run node scripts/prepare-mobile.cjs first');
let port = 4173;
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  let file;
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    file = path.resolve(root, `.${requested === '/' ? '/index.html' : requested}`);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  } catch { res.writeHead(400); return res.end(); }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < 4190) server.listen(++port, '127.0.0.1');
  else { console.error(error); process.exitCode = 1; }
});
server.on('listening', () => console.log(`Wuxing Shouzhen 1.1.0: http://127.0.0.1:${port}/`));
server.listen(port, '127.0.0.1');
