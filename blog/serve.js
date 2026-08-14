// serve.js - minimal static file server for local frontend dev.
// Usage: node serve.js [port] [root]
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2] || '8081', 10);
const root = path.resolve(process.argv[3] || path.join(__dirname, 'frontend'));

const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    let file = path.join(root, urlPath);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(root, urlPath, 'index.html');
    }
    if (!fs.existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
}).listen(port, () => {
    console.log('[serve] http://localhost:' + port + ' -> ' + root);
    console.log('[serve] pages: / , /articles.html , /article.html?id=1 , /admin.html');
});
