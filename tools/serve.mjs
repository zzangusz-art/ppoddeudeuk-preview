// 뽀드득 서버(의존성 없음, Node 22.13 이상) — dist/ 사이트 + 관리자 어드민(/admin) + 접수 API(/api/lead) + 방문 집계(/api/t)
//   로컬 미리보기:  node tools/serve.mjs [포트=5540]            (어드민까지 시험: tools/admin-local.bat)
//   Railway 운영:   npm start  (PORT 는 Railway 가 줌)
//   환경변수
//     DATA_DIR=/data            Railway 볼륨 — 접수 DB(ppoddeudeuk.db)·계정·방문 집계 저장(없으면 재배포 때 사라짐)
//     SESSION_SECRET, ADMIN_USERS  어드민 로그인(tools/admin/make-users.mjs 가 만들어 줌)
//     GITHUB_TOKEN              어드민에서 고친 사이트 내용을 저장소에 커밋(→ 자동 재배포)
//     ALLOW_ORIGINS             다른 주소의 홈페이지가 접수를 보낼 수 있게(기본 https://zzangusz-art.github.io)
//     SITE_NOINDEX=1            미리보기로 쓸 때: 모든 응답 noindex, robots 전체 차단
//     CANONICAL_HOST=도메인     다른 호스트로 온 요청을 https://도메인 으로 301(도메인 연결 뒤)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { handleAdmin } from './admin/server.mjs';
import { countBot, flush } from './admin/stats.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.DIST || 'dist');
const PORT = Number(/^\d+$/.test(process.argv[2] || '') ? process.argv[2] : process.env.PORT || 5540);
const NOINDEX = process.env.SITE_NOINDEX === '1';
const HOST = (process.env.CANONICAL_HOST || '').trim().toLowerCase();
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const TEXT = /^(text\/|application\/(json|xml)|image\/svg)/;
const cacheFor = type => /^text\/(html|plain)|application\/(xml|json)/.test(type) ? 'no-cache' : /javascript|text\/css/.test(type) ? 'public, max-age=3600' : 'public, max-age=604800';
if (!fs.existsSync(path.join(ROOT, 'index.html'))) { console.error(`${ROOT}/index.html 없음 — 먼저 node build.mjs`); process.exit(1); }

function resolve(urlPath) {
  let p; try { p = decodeURIComponent(urlPath); } catch { return null; }
  const abs = path.join(ROOT, p);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;
  for (const cand of [abs, path.join(abs, 'index.html')]) { const st = fs.statSync(cand, { throwIfNoEntry: false }); if (st && st.isFile()) return { abs: cand, st }; }
  return null;
}
const gz = new Map();
function gzipped(f) { const hit = gz.get(f.abs); if (hit && hit.mtime === f.st.mtimeMs) return hit.body; const body = zlib.gzipSync(fs.readFileSync(f.abs)); gz.set(f.abs, { mtime: f.st.mtimeMs, body }); return body; }

http.createServer(async (req, res) => {
  try {
    if (await handleAdmin(req, res)) return;
  } catch (e) { console.error('[serve]', e); if (!res.headersSent) { res.writeHead(500); res.end(); } return; }
  if (NOINDEX) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  const url = new URL(req.url, 'http://x');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
  if (HOST && host && host !== HOST && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) && !host.endsWith('.railway.internal') && host !== 'healthcheck.railway.app') {
    res.writeHead(301, { Location: `https://${HOST}${req.url}` }); res.end(); return;
  }
  if (NOINDEX && url.pathname === '/robots.txt') { res.writeHead(200, { 'Content-Type': TYPES['.txt'] }); res.end('User-agent: *\nDisallow: /\n'); return; }
  const f = resolve(url.pathname);
  if (!f) { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); fs.createReadStream(path.join(ROOT, '404.html')).pipe(res); return; }
  const type = TYPES[path.extname(f.abs).toLowerCase()] || 'application/octet-stream';
  if (type.startsWith('text/html') && req.method === 'GET') countBot(req);
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': cacheFor(type), 'Last-Modified': f.st.mtime.toUTCString(), 'X-Content-Type-Options': 'nosniff' };
  const since = Date.parse(req.headers['if-modified-since'] || '');
  if (since && since >= Math.floor(f.st.mtimeMs / 1000) * 1000 && !req.headers.range) { res.writeHead(304, headers); res.end(); return; }
  const size = f.st.size;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range) {   // 영상 이어받기(아이폰 사파리 재생·탐색)
    const start = range[1] === '' ? size - +range[2] : +range[1];
    const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(+range[2], size - 1);
    if (!(start >= 0 && start <= end && start < size)) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(f.abs, { start, end }).pipe(res);
    return;
  }
  if (TEXT.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    const b = gzipped(f); res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding', 'Content-Length': b.length }); res.end(req.method === 'HEAD' ? undefined : b); return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(f.abs).pipe(res);
}).listen(PORT, () => console.log(`뽀드득 서버: http://localhost:${PORT}/  · 어드민 /admin${NOINDEX ? ' · noindex' : ''}`));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { try { flush(); } catch { /* 무시 */ } process.exit(0); });
