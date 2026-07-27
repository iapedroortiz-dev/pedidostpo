const http = require('http');
const fs = require('fs');
const path = require('path');
const catalogHandler = require('./api/catalog');

const publicDir = path.join(__dirname, 'public');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
function send(res, status, body, headers = {}) { res.writeHead(status, headers); res.end(body); }
function apiResponse(res) {
  res.status = (code) => ({ json: (data) => send(res, code, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8' }) });
  return res;
}
http.createServer(async (req, res) => {
  if (req.url === '/api/catalog' && (req.method === 'GET' || req.method === 'POST')) return catalogHandler(req, apiResponse(res));
  const requestPath = req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(publicDir, path.normalize(requestPath));
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res, 404, 'No encontrado');
  send(res, 200, fs.readFileSync(filePath), { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
}).listen(process.env.PORT || 3000, () => console.log('Pedidos PO disponible en http://localhost:3000'));
