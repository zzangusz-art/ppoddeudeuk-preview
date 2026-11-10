/* 뽀드득 어드민 — GitHub Pages 미리보기용 데모(서버 없이 화면만 둘러보기)
   - build.mjs 가 미리보기 빌드 때 dist/admin/ 에 어드민 화면과 함께 이 파일·demo-data.json 을 넣는다(실제 서버(Railway)의 /admin 에는 들어가지 않음)
   - /api/admin/* 요청을 브라우저 안에서 시험용 데이터로 대신 답한다. 로그인: demo / demo
   - 실제 계정·접수·비밀번호는 전혀 들어 있지 않고, 바꾼 내용은 새로고침하면 처음으로 돌아간다 */
(() => {
  const BASE = location.pathname.replace(/admin\/.*$|admin$/, '');
  window.PPD_ADMIN_BASE = BASE;
  const realFetch = window.fetch.bind(window);
  let DATA = null;
  const load = async () => DATA || (DATA = await realFetch('demo-data.json').then(r => r.json()));
  const kst = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
  const day = n => kst(Date.now() - n * 864e5).slice(0, 10);
  const TYPES = { quick: '빠른 문의', quote: '견적문의', reserve: '예약' }, STATUS = { new: '신규', contacted: '연락함', done: '완료', cancel: '취소' };
  let user = null, nextId = 9;
  const L = (id, ago, type, status, name, phone, use, resort, time, people, detail, memo, admin) => ({ id, created: kst(Date.now() - ago * 3600e3), type, status, name, phone, use_date: use, resort, time, people, detail, memo, admin_memo: admin || '', updated: kst(Date.now() - ago * 3600e3), handled_by: status === 'new' ? '' : '뽀드득 대표', page: '', summary: '' });
  const leads = [
    L(8, 1, 'reserve', 'new', '김민준(시험)', '010-1111-2222', day(-39), '용평스키장', '2타임 주간 09:00~17:00', '4', { ski: ['초급자 스키'], wear: ['프리미엄 의류세트 상의', '프리미엄 의류세트 하의'], lesson: '스키', lessonPeople: '2:1', lessonHours: '2시간' }, '아이 둘 처음 탑니다'),
    L(7, 3, 'quick', 'new', '이서연(시험)', '010-3333-4444', day(-44), '알펜시아스키장', '', '', { topic: ['렌탈', '리프트권'] }, '8살·10살 장비 문의'),
    L(6, 20, 'quote', 'contacted', '박지훈(시험)', '010-5555-6666', day(-60), '용평스키장', '1타임 오전 09:00~13:00', '12', { board: ['중급자 보드'] }, '회사 단체 12명 견적', '11/9 통화, 견적 문자 보냄'),
    L(5, 30, 'reserve', 'done', '최유나(시험)', '010-7777-8888', day(-20), '용평스키장', '1타임 야간 19:00~23:00', '2', { wear: ['하이엔드 의류세트 상의'] }, '', '예약 확정'),
    L(4, 52, 'quick', 'done', '정우성(시험)', '010-2222-9999', day(-25), '용평스키장', '', '', { topic: ['강습'] }, '1:1 강습 3시간', '강습 확정'),
    L(3, 75, 'quote', 'cancel', '한지민(시험)', '010-4444-1212', day(-33), '알펜시아스키장', '', '6', {}, '가족 6명', '일정 변경으로 취소'),
  ];
  const out = l => ({ ...l, typeName: TYPES[l.type], statusName: STATUS[l.status] });
  const counts = () => { const t = day(0), m = t.slice(0, 7), bs = { new: 0, contacted: 0, done: 0, cancel: 0 }, bt = { quick: 0, quote: 0, reserve: 0 };
    for (const l of leads) { bs[l.status]++; bt[l.type]++; }
    return { today: leads.filter(l => l.created.startsWith(t)).length, month: leads.filter(l => l.created.startsWith(m)).length, total: leads.length, byStatus: bs, byType: bt, lastId: Math.max(0, ...leads.map(l => l.id)) }; };
  const visits = n => Array.from({ length: n }, (_, i) => { const k = n - 1 - i, uv = Math.max(0, Math.round(6 + 10 * Math.sin(i / 3) + i * .8)); return { date: day(k), pv: uv * 3, uv, ai: i % 4 === 0 ? 1 : 0, leads: [3, 7, 11].includes(i % 13) ? 1 : 0, calls: i % 3 === 0 ? 2 : 1 }; });
  const statsTotal = list => ({ pv: list.reduce((a, d) => a + d.pv, 0), uv: list.reduce((a, d) => a + d.uv, 0), entries: 0,
    pages: { '/': 120, '/rates/rental/': 64, '/rates/lift/': 51, '/lesson/': 33, '/reserve/': 28, '/blog/yongpyong-rental-shop/': 19, '/location/': 15 },
    sources: { '네이버 검색': 46, '직접 방문': 38, '구글': 17, 'AI 답변': 5, '네이버 지도·플레이스': 12, '카카오맵': 6 },
    refs: { 'blog.naver.com': 7, 'map.naver.com': 5 }, ai: { ChatGPT: 3, Perplexity: 2 }, search: { '용평렌탈샵': 14, '용평스키장 렌탈': 9, '알펜시아렌탈샵': 6, '용평 리프트권 할인': 5 },
    devices: { '휴대폰': 81, PC: 27, '태블릿': 3 }, bots: { 'Googlebot': 40, '네이버 Yeti': 36, 'OpenAI(ChatGPT)': 9, 'Anthropic(Claude)': 4 }, events: { call_click: 22, map_click: 9, quick_open: 14, sms_click: 3 }, leads: { quick: 2, quote: 2, reserve: 2 } });
  const site = {};   // 데모에서 고친 내용(새로고침하면 사라짐)
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  const bad = (msg, status = 400) => json({ error: msg }, status);

  async function api(method, path, body) {
    const D = await load(), q = new URL(path, location.origin).searchParams, p = path.split('?')[0].replace(/^.*\/api\/admin/, '');
    if (p === '/me') return json({ user, ready: true, store: 'demo', storeReady: true, canWriteUsers: true, dbPersistent: true, types: TYPES, status: STATUS, galleryCats: D.galleryCats, faqPages: D.faqPages, sections: {} });
    if (p === '/login') { if (body.id === 'demo' && body.pw === 'demo') { user = { id: 'demo', name: '데모 관리자', role: 'owner', roleName: '관리자' }; return json({ ok: true }); } return bad('데모 아이디·비밀번호는 demo / demo 입니다', 401); }
    if (p === '/logout') { user = null; return json({ ok: true }); }
    if (!user) return bad('로그인이 필요합니다', 401);
    if (p === '/dashboard') { const v = visits(14); return json({ counts: counts(), daily: v.map(x => ({ date: x.date, n: x.leads })), recent: leads.slice(0, 6).map(out), visits: v, totals: { uv: v.reduce((a, b) => a + b.uv, 0), pv: v.reduce((a, b) => a + b.pv, 0), calls: v.reduce((a, b) => a + b.calls, 0) }, statsPersistent: true }); }
    if (p === '/poll') { const c = counts(); return json({ lastId: c.lastId, newCount: c.byStatus.new }); }
    if (p === '/leads') {
      let list = leads.slice().sort((a, b) => b.id - a.id); const st = q.get('status'), ty = q.get('type'), s = (q.get('q') || '').trim();
      if (st) list = list.filter(l => l.status === st); if (ty) list = list.filter(l => l.type === ty);
      if (s) list = list.filter(l => [l.name, l.phone, l.phone.replace(/-/g, ''), l.memo, l.admin_memo].some(x => String(x).includes(s)));
      return json({ total: list.length, page: 1, size: 30, items: list.map(out), counts: counts() });
    }
    let m = p.match(/^\/leads\/(\d+)$/);
    if (m) { const l = leads.find(x => x.id === +m[1]); if (!l) return bad('접수를 찾지 못했습니다', 404);
      if (method === 'GET') return json({ lead: out(l) });
      if (method === 'DELETE') { leads.splice(leads.indexOf(l), 1); return json({ ok: true }); }
      if (STATUS[body.status]) l.status = body.status; if (body.adminMemo != null) l.admin_memo = body.adminMemo; l.updated = kst(); l.handled_by = '데모 관리자'; return json({ lead: out(l) }); }
    m = p.match(/^\/content\/(\w+)$/);
    if (m) { const k = m[1], def = D.defaults[k];
      if (method === 'GET') return json({ value: site[k] ?? def, default: def, changed: k in site });
      if (body.reset) delete site[k]; else site[k] = body.value;
      return json({ ok: true, commit: 'local-demo', value: site[k] ?? def }); }
    if (p.startsWith('/status/')) return json({ state: 'success' });
    if (p === '/stats') { const v = visits(Math.min(90, +q.get('days') || 30)); return json({ days: v, total: statsTotal(v), persistent: true }); }
    if (p === '/blog') { const now = kst().slice(0, 16); return json({ posts: D.posts.map(x => ({ ...x, live: `${x.date} ${x.time || '00:00'}` <= now })), todo: D.todo, drafts: [] }); }
    if (p === '/blog/topics') return json({ ok: true, commit: 'local-demo' });
    if (p === '/log') return json({ commits: D.commits, audit: [{ at: kst(Date.now() - 36e5), user: '뽀드득 대표', action: '접수 연락함', target: '#6' }, { at: kst(Date.now() - 72e5), user: '뽀드득 대표', action: '로그인', target: '' }, { at: kst(Date.now() - 864e5), user: 'Kevin(세느루)', action: '요금 저장', target: '' }] });
    if (p === '/users') { if (method === 'GET') return json({ users: [{ id: 'kevin', name: 'Kevin(세느루)', role: 'owner', roleName: '관리자', created: '2026-11-10' }, { id: 'ppoddeudeuk', name: '뽀드득 대표', role: 'client', roleName: '업체 담당자', created: '2026-11-10' }, { id: 'demo', name: '데모 관리자', role: 'owner', roleName: '관리자', created: '2026-11-10' }], canWrite: true });
      return json({ ok: true, password: '(데모 — 실제 비밀번호는 만들지 않습니다)' }); }
    if (p === '/me/password') return bad('데모에서는 비밀번호를 바꿀 수 없습니다');
    return bad('없는 요청', 404);
  }
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (/\/api\/admin\//.test(url)) { let body = {}; try { body = init.body ? JSON.parse(init.body) : {}; } catch { /* 무시 */ } return api((init.method || 'GET').toUpperCase(), url, body); }
    return realFetch(input, init);
  };
  // 엑셀(CSV) 내려받기 링크: 시험용 접수로 파일을 만들어 준다
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="/api/admin/leads.csv"]'); if (!a) return;
    e.preventDefault();
    const rows = [['번호', '접수일시', '종류', '상태', '이름', '연락처', '이용날짜', '스키장', '고객 요청', '관리 메모'], ...leads.map(l => [l.id, l.created, TYPES[l.type], STATUS[l.status], l.name, l.phone, l.use_date, l.resort, l.memo, l.admin_memo])];
    const blob = new Blob(['﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')], { type: 'text/csv' });
    const u = URL.createObjectURL(blob), x = document.createElement('a'); x.href = u; x.download = '뽀드득_접수_데모.csv'; x.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
  }, true);
})();
