// Local preview of the static export; no additional server dependency.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../out/', import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

try { await stat(path.join(root, 'index.html')); }
catch { console.error('Execute npm run build antes de npm start.'); process.exit(1); }

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let candidate;
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (basePath) {
      if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) throw new Error('Outside base path');
      pathname = pathname.slice(basePath.length) || '/';
    }
    candidate = path.resolve(root, `.${pathname}`);
    if (candidate !== path.resolve(root) && !candidate.startsWith(root)) throw new Error('Outside export');
    if ((await stat(candidate)).isDirectory()) candidate = path.join(candidate, 'index.html');
    const body = await readFile(candidate);
    response.writeHead(200, { 'Content-Type': types[path.extname(candidate)] ?? 'application/octet-stream', 'Content-Length': body.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Página não encontrada.');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`ATHENA · http://127.0.0.1:${port}${basePath}/`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
