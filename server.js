/**
 * Local development server: serves the static app and the /api/brief function.
 *   ANTHROPIC_API_KEY=sk-... node server.js
 * Without a key the app still works; the AI Brief buttons stay hidden.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const brief = require('./api/brief.js');

const PORT = process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.csv': 'text/csv', '.js': 'text/javascript', '.md': 'text/markdown' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/brief') return brief(req, res);
  const file = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Supply Chain AI Toolkit → http://localhost:${PORT}  (AI brief ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled: no ANTHROPIC_API_KEY'})`));
