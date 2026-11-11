// 뽀드득 관리자 어드민(/admin) + 홈페이지 접수 API — tools/serve.mjs 가 요청을 먼저 여기로 넘긴다
//   화면: tools/admin/public/ (로그인 → 대시보드·접수 관리·콘텐츠·요금·기본정보·접속 통계, 관리자 전용: 추적 코드·작업 기록·계정)
//   어드민 API : /api/admin/* (서명 쿠키 로그인, 쓰기 요청은 X-PPD-Admin 헤더 필수 — 다른 사이트가 몰래 보내는 요청 차단)
//   홈페이지 API: POST /api/lead (접수 저장), POST /api/lead/check (예약·견적 확인), POST /api/t (방문 집계)
//   저장: 접수 = db.mjs(SQLite, 서버 볼륨) / 사이트 내용 = store.mjs(content/site.json 커밋 → 자동 재배포)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES, canWriteUsers, cookieHeader, hashPassword, loadUsers, login, newPassword, ready, saveUsers, sessionUser } from './auth.mjs';
import { makeStore } from './store.mjs';
import { summary as statsSummary, countEvent, countLead, clientIp, BOT_RE } from './stats.mjs';
import * as DB from './db.mjs';
import { DEFAULTS, GALLERY_CATS, FAQ_PAGES } from '../../src/data.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PUB = path.join(HERE, 'public');
const store = makeStore(ROOT);
const MAX_BODY = 30 * 1024 * 1024, MAX_FILE = 6 * 1024 * 1024;
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const CSP = "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src https://fonts.gstatic.com https://cdn.jsdelivr.net; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
// 다른 주소(GitHub Pages 미리보기 등)에 있는 홈페이지가 접수를 보낼 수 있게 허용할 출처
const ORIGINS = (process.env.ALLOW_ORIGINS || 'https://zzangusz-art.github.io').split(',').map(s => s.trim()).filter(Boolean);

class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
const need = (cond, status, msg, extra) => { if (!cond) throw new HttpError(status, msg, extra); };
function send(res, code, obj, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...headers });
  res.end(JSON.stringify(obj));
}
function body(req, max = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > max) { reject(new HttpError(413, '한 번에 올릴 수 있는 용량을 넘었습니다')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new HttpError(400, '요청 형식 오류')); } });
    req.on('error', reject);
  });
}
const oneLine = (s, n = 200) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const text = (s, n = 2000) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const int = (v, max = 10e6) => { const n = Math.round(+String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };
const stamp = () => new Date(Date.now() + 9 * 3600e3).toISOString().replace(/\D/g, '').slice(2, 14);
const commitMsg = (u, what) => `어드민: ${what}\n\n${ROLES[u.role] || u.role} ${u.name} (${u.id}) · ${new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')} KST`;

// ── 사진: data:image/...;base64 → assets/img/up/ 에 저장. 기존 사진은 assets/img 안 경로만
function decodeImage(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  need(m, 400, '사진 형식은 JPG·PNG·WebP 만 올릴 수 있습니다');
  need(m[2].length * 0.75 <= MAX_FILE, 400, '사진 한 장은 6MB 이하로 올려 주세요');
  return { base64: m[2], ext: m[1] === 'jpeg' ? 'jpg' : m[1] };
}
const okImg = p => typeof p === 'string' && /^[\w\-/]+\.(webp|jpe?g|png)$/i.test(p) && !p.includes('..');
function imageField(v, key, files, i, required = true) {
  if (v && typeof v === 'object' && v.data) { const img = decodeImage(v.data), p = `up/${key}-${stamp()}-${i}-${Math.random().toString(36).slice(2, 6)}.${img.ext}`; files.push({ path: `assets/img/${p}`, base64: img.base64 }); return p; }
  if (okImg(v)) return v;
  need(!required, 400, '사진이 없는 항목이 있습니다');
  return '';
}
const usedUploads = obj => new Set((JSON.stringify(obj).match(/"up\/[^"]+"/g) || []).map(s => s.slice(1, -1)));

// ── 사이트 내용(content/site.json) 항목별 검사·정리
const SECTIONS = {
  site: { name: '기본정보', owner: false, clean: v => {
    const phone = oneLine(v.phone, 20), sms = oneLine(v.sms, 20);
    need(/^0\d{1,2}-\d{3,4}-\d{4}$/.test(phone), 400, '대표전화 형식: 033-336-9884');
    need(!sms || /^0\d{1,2}-\d{3,4}-\d{4}$/.test(sms), 400, '문자 번호 형식: 010-0000-0000');
    return { phone, sms, hours: oneLine(v.hours, 60) };
  } },
  tags: { name: '추적 코드', owner: true, clean: v => {
    const o = { ga4: oneLine(v.ga4, 30), naverWa: oneLine(v.naverWa, 40), naverVerify: oneLine(v.naverVerify, 80), googleVerify: oneLine(v.googleVerify, 80) };
    need(!o.ga4 || /^G-[A-Z0-9]{4,}$/.test(o.ga4), 400, 'GA4 측정 ID 형식: G-XXXXXXX');
    for (const k of ['naverWa', 'naverVerify', 'googleVerify']) need(!o[k] || /^[\w-]+$/.test(o[k]), 400, `${k}: 영문·숫자·-·_ 만`);
    return o;
  } },
  popup: { name: '팝업', clean: (v, files) => {
    const o = { on: !!v.on, title: oneLine(v.title, 40), body: text(v.body, 300), img: imageField(v.img, 'popup', files, 0, false), link: oneLine(v.link, 200), linkText: oneLine(v.linkText, 20), from: isDate(v.from) ? v.from : '', to: isDate(v.to) ? v.to : '' };
    need(!o.on || o.title || o.img, 400, '팝업을 켜려면 제목이나 사진이 필요합니다');
    need(!o.link || /^https:\/\//.test(o.link) || /^\/?[\w\-/#?=&.]*$/.test(o.link), 400, '링크는 https:// 주소나 사이트 안 경로(예: /reserve/)만');
    need(!o.from || !o.to || o.from <= o.to, 400, '팝업 기간: 시작일이 종료일보다 늦습니다');
    return o;
  } },
  notices: { name: '공지사항', clean: v => {
    need(Array.isArray(v) && v.length <= 200, 400, '형식 오류'); const ids = new Set();
    return v.map((n, i) => {
      const title = oneLine(n.title, 80); need(title, 400, `${i + 1}번째 공지: 제목을 입력해 주세요`);
      let id = oneLine(n.id, 40); if (!/^[a-z0-9-]{2,40}$/.test(id) || ids.has(id)) id = `n${stamp()}${i}`; ids.add(id);
      const b = (Array.isArray(n.body) ? n.body.join('\n') : text(n.body, 5000)).split('\n').map(s => s.trim()).filter(Boolean);
      need(b.length, 400, `「${title}」: 내용을 입력해 주세요`);
      return { id, date: isDate(n.date) ? n.date : kst(), title, body: b };
    });
  } },
  gallery: { name: '갤러리', clean: (v, files) => {
    need(Array.isArray(v) && v.length <= 300, 400, '형식 오류');
    return v.map((g, i) => ({ cat: GALLERY_CATS.includes(g.cat) ? g.cat : GALLERY_CATS[0], img: imageField(g.img, 'gallery', files, i), title: oneLine(g.title, 40) || '뽀드득 갤러리', date: isDate(g.date) ? g.date : kst() }));
  } },
  used: { name: '중고장비', clean: (v, files) => {
    need(Array.isArray(v) && v.length <= 100, 400, '형식 오류');
    return v.map((g, i) => { const title = oneLine(g.title, 50); need(title, 400, `${i + 1}번째 상품: 제목을 입력해 주세요`);
      return { img: imageField(g.img, 'used', files, i), title, body: text(g.body, 500), price: int(g.price), qty: Math.max(1, int(g.qty, 999)), date: isDate(g.date) ? g.date : kst(), ...(g.sold ? { sold: true } : {}) }; });
  } },
  faq: { name: '자주 묻는 질문', clean: v => {
    need(Array.isArray(v) && v.length <= 60, 400, '형식 오류'); const keys = FAQ_PAGES.map(p => p[0]);
    return v.map((f, i) => { const q = oneLine(f.q, 120), a = text(f.a, 1200).replace(/\n+/g, ' '); need(q && a, 400, `${i + 1}번째 질문: 질문과 답을 입력해 주세요`);
      const pages = (Array.isArray(f.pages) ? f.pages : []).filter(p => keys.includes(p)); return { q, a, pages: pages.length ? pages : ['home'] }; });
  } },
  instructors: { name: '강사진', clean: (v, files) => {
    need(Array.isArray(v) && v.length <= 40, 400, '형식 오류');
    return v.map((t, i) => { const o = { img: imageField(t.img, 'instructor', files, i), name: oneLine(t.name, 20), cred: oneLine(t.cred, 60), career: oneLine(t.career, 120) };
      need(o.name || o.cred, 400, `${i + 1}번째 강사: 이름이나 자격을 입력해 주세요`); for (const k of ['name', 'career']) if (!o[k]) delete o[k]; return o; });
  } },
  lift: { name: '리프트 요금', clean: v => {
    const base = DEFAULTS.lift; need(Array.isArray(v) && v.length === base.length, 400, '형식 오류');
    return base.map((b, i) => { const x = v[i] || {};
      const pair = (arr, ref) => ref.map((r, k) => [int((arr || [])[k]?.[0]), int((arr || [])[k]?.[1])]);
      const rows = b.rows.map((r, k) => { const y = (x.rows || [])[k] || {}; const o = { ...r, detail: (Array.isArray(y.detail) ? y.detail : r.detail).map(s => oneLine(s, 40)).filter(Boolean), adult: pair(y.adult, r.adult), child: pair(y.child, r.child) };
        for (const [n, arr] of [['대인', o.adult], ['소인', o.child]]) for (const [a, d] of arr) need(!a || d <= a, 400, `${b.resort} ${r.time} ${n}: 할인가가 정상가보다 큽니다`);
        return o; });
      return { ...b, title: oneLine(x.title, 60) || b.title, note: text(x.note, 300) || b.note, seasons: (Array.isArray(x.seasons) ? x.seasons : b.seasons).map(s => oneLine(s, 30)).slice(0, b.seasons.length), rows };
    });
  } },
  rental: { name: '렌탈 요금', clean: v => {
    const base = DEFAULTS.rental; need(Array.isArray(v) && v.length === base.length, 400, '형식 오류');
    return base.map((g, i) => { const items = (v[i] && Array.isArray(v[i].items) ? v[i].items : []).slice(0, 30).map((it, k) => {
      const name = oneLine(it.name, 50); need(name, 400, `${g.group} ${k + 1}번째: 품목 이름을 입력해 주세요`);
      const p = g.flat ? [0, 1, 2].map(j => int((it.p || [])[j])) : [0, 1, 2].map(j => [int((it.p || [])[j]?.[0]), int((it.p || [])[j]?.[1])]);
      if (!g.flat) p.forEach(([a, b], j) => need(!a || b <= a, 400, `「${name}」 ${j + 1}타임: 예약가가 정상가보다 큽니다`));
      const o = { name, p }; const sub = oneLine(it.sub, 80); if (sub) o.sub = sub; return o; });
      need(items.length, 400, `${g.group}: 품목이 한 개는 있어야 합니다`);
      return { ...g, items }; });
  } },
  lesson: { name: '강습 요금', clean: v => {
    const b = DEFAULTS.lesson; const rows = (Array.isArray(v.rows) ? v.rows : []).slice(0, 6).map((r, i) => { const name = oneLine(r.name, 20); need(name, 400, `${i + 1}번째 강습: 이름을 입력해 주세요`); return { name, p: b.hours.map((_, k) => int((r.p || [])[k])) }; });
    need(rows.length, 400, '강습 요금이 한 줄은 있어야 합니다');
    return { ...b, note: text(v.note, 300) || b.note, rows, rules: (Array.isArray(v.rules) ? v.rules : b.rules).map(s => oneLine(s, 120)).filter(Boolean).slice(0, 8) };
  } },
};

async function readSiteJson() { const f = await store.read('content/site.json'); try { return f ? JSON.parse(f.text) : {}; } catch { return {}; } }

// ── 화면 파일
function serveStatic(req, res, p) {
  const rel = p.replace(/^\/admin\/?/, '') || 'index.html';
  const file = path.join(PUB, path.normalize(rel));
  const target = file.startsWith(PUB + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(PUB, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': CSP, 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff' });
  res.end(fs.readFileSync(target));
}

// ── 어드민 API
const routes = [];
const route = (method, pattern, role, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), role, fn });

route('GET', '/api/admin/me', null, async ({ user }) => ({
  user: user && { id: user.id, name: user.name, role: user.role, roleName: ROLES[user.role] }, ready: ready(), store: store.kind, storeReady: store.ready(),
  canWriteUsers: canWriteUsers(), dbPersistent: DB.dbPersistent(), types: DB.TYPES, status: DB.STATUS, galleryCats: GALLERY_CATS, faqPages: FAQ_PAGES,
  sections: Object.fromEntries(Object.entries(SECTIONS).map(([k, s]) => [k, { name: s.name, owner: !!s.owner }])) }));

route('GET', '/api/admin/dashboard', 'client', async () => {
  const st = statsSummary(14);
  return { counts: DB.counts(), daily: DB.dailyLeads(14), recent: DB.listLeads({ size: 6 }).items, visits: st.days, totals: { uv: st.total.uv, pv: st.total.pv, calls: st.total.events.call_click || 0 }, statsPersistent: st.persistent };
});
route('GET', '/api/admin/poll', 'client', async () => { const c = DB.counts(); return { lastId: c.lastId, newCount: c.byStatus.new }; });

// 접수 관리
route('GET', '/api/admin/leads', 'client', async ({ query }) => ({ ...DB.listLeads({ status: query.get('status') || '', type: query.get('type') || '', q: query.get('q') || '', page: query.get('page') || 1, size: query.get('size') || 30 }), counts: DB.counts() }));
route('GET', '/api/admin/leads/day', 'client', async ({ query }) => {
  const date = query.get('date') || '', types = (query.get('types') || 'reserve').split(',');
  return { date, items: DB.leadsByDate(date, { types, cancel: query.get('cancel') === '1' }), dates: DB.useDates(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)) };
});
route('GET', '/api/admin/leads/:id', 'client', async ({ params }) => { const l = DB.getLead(params.id); need(l, 404, '접수를 찾지 못했습니다'); return { lead: l }; });
route('POST', '/api/admin/leads/:id', 'client', async ({ params, data, user }) => { const l = DB.updateLead(params.id, { status: data.status, adminMemo: data.adminMemo }, user.name); need(l, 404, '접수를 찾지 못했습니다'); return { lead: l }; });
route('DELETE', '/api/admin/leads/:id', 'client', async ({ params, user }) => { need(DB.deleteLead(params.id, user.name), 404, '접수를 찾지 못했습니다'); return { ok: true }; });

// 사이트 내용
route('GET', '/api/admin/content/:key', 'client', async ({ params, user }) => {
  const s = SECTIONS[params.key]; need(s, 404, '없는 항목'); need(!s.owner || user.role === 'owner', 403, '관리자만 쓸 수 있는 메뉴입니다');
  const site = await readSiteJson();
  return { value: site[params.key] ?? DEFAULTS[params.key], default: DEFAULTS[params.key], changed: params.key in site };
});
route('POST', '/api/admin/content/:key', 'client', async ({ params, data, user }) => {
  const s = SECTIONS[params.key]; need(s, 404, '없는 항목'); need(!s.owner || user.role === 'owner', 403, '관리자만 쓸 수 있는 메뉴입니다');
  const site = await readSiteJson(), before = usedUploads(site), files = [];
  if (data.reset) delete site[params.key];
  else site[params.key] = s.clean(data.value ?? {}, files);
  // 더는 쓰지 않는 업로드 사진 정리
  const after = usedUploads(site);
  for (const p of before) if (!after.has(p)) files.push({ path: `assets/img/${p}`, delete: true });
  files.push({ path: 'content/site.json', text: JSON.stringify(site, null, 1) + '\n' });
  const c = await store.commit(files, commitMsg(user, `${s.name} ${data.reset ? '기본값으로 되돌림' : '수정'}`), user.name);
  DB.audit(user.name, `${s.name} ${data.reset ? '되돌림' : '저장'}`);
  return { ok: true, commit: c.sha, value: site[params.key] ?? DEFAULTS[params.key] };
});
route('GET', '/api/admin/status/:sha', 'client', async ({ params }) => store.status(params.sha));

// 블로그(매일 09·13·18시 자동 발행) — 글은 저장소 content/blog, 이 서버에 배포된 것 기준으로 보여 준다
route('GET', '/api/admin/blog', 'owner', async () => {
  const { loadPosts } = await import('../blog/lib.mjs');
  const dir = path.join(ROOT, 'content/blog'), now = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  const posts = loadPosts(dir).map(p => ({ slug: p.slug, title: p.title, date: p.date, time: p.time || '', category: p.category, keyword: p.keyword, chars: p.chars, generated: p.generated || '', live: `${p.date} ${p.time || '00:00'}` <= now }));
  let topics = []; try { topics = JSON.parse(fs.readFileSync(path.join(dir, '_topics.json'), 'utf8')); } catch { /* 없음 */ }
  const draftsDir = path.join(ROOT, 'content/drafts'), drafts = fs.existsSync(draftsDir) ? fs.readdirSync(draftsDir).filter(f => f.endsWith('.md')) : [];
  return { posts, todo: topics.filter(t => t.status === 'todo').map(t => ({ id: t.id, title: t.title, keywords: t.keywords, category: t.category })), drafts };
});
route('POST', '/api/admin/blog/topics', 'owner', async ({ data, user }) => {
  need(store.ready(), 503, '저장소(GitHub) 연결이 안 되어 있습니다');
  const f = await store.read('content/blog/_topics.json'); const list = f ? JSON.parse(f.text) : [];
  const kw = String(data.keywords || '').split(',').map(x => oneLine(x, 30)).filter(Boolean).slice(0, 4), title = oneLine(data.title, 50);
  need(kw.length && title, 400, '주제와 검색어를 입력해 주세요');
  const id = 'topic-' + stamp(); const at = list.findIndex(t => t.status === 'todo'); list.splice(at < 0 ? list.length : at, 0, { id, title, angle: oneLine(data.angle, 200) || title, keywords: kw, category: oneLine(data.category, 20) || '렌탈 가이드', status: 'todo', addedBy: user.id });
  const c = await store.commit([{ path: 'content/blog/_topics.json', text: JSON.stringify(list, null, 2) + '\n' }], commitMsg(user, `블로그 주제 추가 「${title}」`), user.name);
  DB.audit(user.name, '블로그 주제 추가', title); return { ok: true, commit: c.sha };
});

// 접속 통계
route('GET', '/api/admin/stats', 'client', async ({ query }) => statsSummary(Math.min(90, Math.max(1, +query.get('days') || 30))));

// 관리자 전용
route('GET', '/api/admin/log', 'owner', async () => ({ commits: await store.recent(25).catch(() => []), audit: DB.auditLog(60) }));
route('GET', '/api/admin/users', 'owner', async () => ({ users: loadUsers().map(u => ({ id: u.id, name: u.name, role: u.role, roleName: ROLES[u.role], created: u.created, changed: u.changed })), canWrite: canWriteUsers() }));
route('POST', '/api/admin/users', 'owner', async ({ data, user }) => {
  const list = loadUsers(), act = data.action, id = oneLine(data.id, 20);
  if (act === 'create') {
    need(/^[a-z0-9_.-]{3,20}$/.test(id), 400, '아이디는 영문 소문자·숫자 3~20자'); need(!list.some(u => u.id === id), 400, '이미 있는 아이디');
    const pw = newPassword(); list.push({ id, name: oneLine(data.name, 20) || id, role: data.role === 'owner' ? 'owner' : 'client', hash: hashPassword(pw), created: kst() }); saveUsers(list);
    DB.audit(user.name, '계정 만들기', id); return { ok: true, password: pw };
  }
  const u = list.find(x => x.id === id); need(u, 404, '계정을 찾지 못했습니다');
  if (act === 'reset') { const pw = newPassword(); u.hash = hashPassword(pw); u.changed = kst(); saveUsers(list); DB.audit(user.name, '비밀번호 초기화', id); return { ok: true, password: pw }; }
  if (act === 'delete') { need(u.id !== user.id, 400, '내 계정은 지울 수 없습니다'); saveUsers(list.filter(x => x.id !== id)); DB.audit(user.name, '계정 삭제', id); return { ok: true }; }
  throw new HttpError(400, '알 수 없는 요청');
});
route('POST', '/api/admin/me/password', 'client', async ({ data, user }) => {
  const r = login(user.id, data.current, 'pw:' + user.id); need(r.user, 400, '지금 비밀번호가 맞지 않습니다');
  const next = String(data.next || ''); need(next.length >= 10 && /[a-zA-Z]/.test(next) && /\d/.test(next), 400, '새 비밀번호는 10자 이상, 영문과 숫자를 섞어 주세요');
  const list = loadUsers(); const u = list.find(x => x.id === user.id); u.hash = hashPassword(next); u.changed = kst(); saveUsers(list);
  DB.audit(user.name, '내 비밀번호 변경'); return { ok: true };
});

// ── 홈페이지 접수 API(로그인 없음): 같은 IP 10분에 5건, 확인은 15분에 10번까지
const limits = new Map();
function limited(key, n, ms) { const now = Date.now(), r = limits.get(key) || { n: 0, t: now }; if (now - r.t > ms) { r.n = 0; r.t = now; } r.n++; limits.set(key, r); if (limits.size > 5000) limits.clear(); return r.n > n; }
function cors(req) {
  const o = String(req.headers.origin || '');
  return ORIGINS.includes(o) ? { 'Access-Control-Allow-Origin': o, Vary: 'Origin' } : {};
}
async function handlePublic(req, res, p) {
  const h = cors(req);
  if (req.method === 'OPTIONS') { res.writeHead(204, { ...h, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' }); res.end(); return true; }
  if (req.method !== 'POST') return false;
  // 다른 출처에서 왔는데 허용 목록에 없으면 거절(같은 서버의 홈페이지는 Origin 이 자기 주소)
  const origin = String(req.headers.origin || ''), host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const sameOrigin = !origin || origin.replace(/^https?:\/\//, '') === host;
  try {
    if (p === '/api/t') { const d = await body(req, 4096).catch(() => ({})); countEvent(req, d || {}); res.writeHead(204, h); res.end(); return true; }
    need(sameOrigin || h['Access-Control-Allow-Origin'], 403, '허용되지 않은 요청');
    const ip = clientIp(req);
    if (p === '/api/lead') {
      need(!BOT_RE.test(String(req.headers['user-agent'] || '')), 403, '허용되지 않은 요청');
      need(!limited('lead|' + ip, 5, 10 * 60e3), 429, '접수가 너무 많습니다. 잠시 뒤 다시 보내거나 전화 주세요.');
      const d = await body(req, 32 * 1024);
      if (d.company) { send(res, 200, { ok: true }, h); return true; }   // 자동 등록(봇) — 저장하지 않고 성공처럼
      const id = DB.addLead(d, DB.ipHash(ip)); countLead(d.type);
      send(res, 200, { ok: true, id }, h); return true;
    }
    if (p === '/api/lead/check') {
      need(!limited('check|' + ip, 10, 15 * 60e3), 429, '확인 요청이 많습니다. 15분 뒤 다시 시도하거나 전화 주세요.');
      const d = await body(req, 4096);
      need(oneLine(d.name, 20) && /^0\d{8,10}$/.test(String(d.phone || '').replace(/\D/g, '')), 400, '이름과 연락처를 확인해 주세요');
      send(res, 200, { items: DB.checkLeads(d.name, d.phone) }, h); return true;
    }
    return false;
  } catch (e) {
    const status = e.status && e.status < 600 ? e.status : 500;
    if (status >= 500) console.error('[lead]', e);
    send(res, status, { error: status >= 500 ? '접수 중 오류가 났습니다. 전화로 문의해 주세요.' : e.message }, h); return true;
  }
}

// ── 진입점: 처리했으면 true
export async function handleAdmin(req, res) {
  const url = new URL(req.url, 'http://x'), p = url.pathname;
  if (p === '/api/lead' || p === '/api/lead/check' || p === '/api/t') return handlePublic(req, res, p);
  if (p === '/admin' || p.startsWith('/admin/')) { if (req.method === 'GET' || req.method === 'HEAD') { serveStatic(req, res, p); return true; } return false; }
  if (!p.startsWith('/api/admin/')) return false;
  const secure = String(req.headers['x-forwarded-proto'] || '').includes('https');
  try {
    if (p === '/api/admin/login' && req.method === 'POST') {
      need(req.headers['x-ppd-admin'] === '1', 403, '잘못된 요청');
      need(ready(), 503, '어드민 초기 설정이 필요합니다(계정·SESSION_SECRET)');
      const d = await body(req, 4096);
      const r = login(d.id, d.pw, clientIp(req));
      if (r.error) return send(res, 401, { error: r.error }), true;
      DB.audit(r.user.name, '로그인');
      send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(r.cookie, secure) }); return true;
    }
    if (p === '/api/admin/logout' && req.method === 'POST') { send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader('', secure) }); return true; }
    const user = sessionUser(req.headers.cookie);
    // 엑셀(CSV) 내려받기: 로그인한 사람만, 파일로
    if (p === '/api/admin/leads.csv' && req.method === 'GET') {
      need(user, 401, '로그인이 필요합니다');
      DB.audit(user.name, '접수 엑셀 내려받기');
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`뽀드득_접수_${kst()}.csv`)}`, 'Cache-Control': 'no-store' });
      res.end(DB.csv({ status: url.searchParams.get('status') || '', type: url.searchParams.get('type') || '' })); return true;
    }
    for (const r of routes) {
      const m = r.method === req.method && p.match(r.re); if (!m) continue;
      if (r.role) {
        need(user, 401, '로그인이 필요합니다');
        need(r.role === 'client' || user.role === 'owner', 403, '관리자만 쓸 수 있는 메뉴입니다');
      }
      if (req.method !== 'GET') need(req.headers['x-ppd-admin'] === '1', 403, '잘못된 요청');
      if (r.role && req.method === 'POST' && p.startsWith('/api/admin/content/')) need(store.ready(), 503, '저장소(GitHub) 연결이 안 되어 있습니다 — 서버 변수 GITHUB_TOKEN');
      const data = req.method === 'GET' ? {} : await body(req);
      send(res, 200, await r.fn({ user, data, params: m.groups || {}, query: url.searchParams }) || { ok: true }); return true;
    }
    send(res, 404, { error: '없는 요청' }); return true;
  } catch (e) {
    const status = e.status && e.status < 600 ? e.status : 500;
    if (status >= 500) console.error('[admin]', e);
    send(res, status, { error: status >= 500 && !(e instanceof HttpError) ? `처리 중 오류: ${e.message}` : e.message, ...(e.extra || {}) }); return true;
  }
}
