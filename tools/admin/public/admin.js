/* 뽀드득 관리자 화면
   현황: 대시보드 · 접수 관리(홈페이지 빠른 문의·견적·예약 = DB) · 접속 통계
   사이트 내용: 공지사항 · 갤러리 · 중고장비 · 자주 묻는 질문 · 강사진 · 요금(리프트·렌탈·강습) · 팝업 · 기본정보
   관리자 전용: 추적 코드 · 작업 기록 · 계정 관리
   사이트 내용은 저장하면 약 1~2분 뒤 홈페이지에 반영된다(오른쪽 위 '사이트 반영' 표시). 접수는 바로 저장된다. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => (+n || 0).toLocaleString('ko-KR') + '원';
  const num = n => (+n || 0).toLocaleString('ko-KR');
  const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const clone = o => JSON.parse(JSON.stringify(o));
  let ME = null, dirty = false, lastId = 0, newCount = 0;
  // 사이트 주소 앞부분(GitHub Pages 미리보기는 /ppoddeudeuk-preview/ 아래라 demo-api.js 가 PPD_ADMIN_BASE 를 정함)
  const BASE = window.PPD_ADMIN_BASE || '/';

  async function api(method, url, data) {
    const res = await fetch(url, { method, credentials: 'same-origin', headers: { 'X-PPD-Admin': '1', ...(data ? { 'Content-Type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401 && ME && ME.user && !url.endsWith('/login')) { ME.user = null; dirty = false; render(); }
    if (!res.ok) { const e = new Error(j.error || `오류(${res.status})`); e.data = j; throw e; }
    return j;
  }
  let tt;
  function toast(t, ms = 3600) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), ms); }
  const fail = e => toast(e.message || String(e), 6000);

  // ── 사이트 반영 표시
  let deploy = { state: '', text: '' }, watcher = null;
  function setDeploy(state, text) { deploy = { state, text }; const el = $('#deploy'); if (el) { el.className = 'deploy ' + state; el.textContent = text; el.hidden = !text; } }
  function watchDeploy(sha) {
    clearInterval(watcher);
    if (ME.store === 'demo') { setDeploy('pending', '데모 — 실제로 저장되지 않습니다'); return; }
    if (!sha || String(sha).startsWith('local')) { setDeploy('success', '저장됨(로컬 시험)'); return; }
    setDeploy('pending', '사이트 반영 중… (약 1~2분)'); let n = 0;
    watcher = setInterval(async () => {
      n++;
      try { const s = await api('GET', `/api/admin/status/${sha}`);
        if (s.state === 'success') { setDeploy('success', '사이트 반영 완료'); clearInterval(watcher); }
        else if (s.state === 'failure') { setDeploy('failure', '사이트 반영 실패 — 관리자에게 알려 주세요'); clearInterval(watcher); } } catch { /* 다음에 */ }
      if (n > 30) { clearInterval(watcher); setDeploy('', ''); }
    }, 12000);
  }
  const saved = (r, what) => { dirty = false; toast(ME.store === 'demo' ? `데모 화면이라 ${what}은(는) 실제로 저장되지 않습니다` : `${what} 저장했습니다. ${ME.store === 'local' ? '' : '약 1~2분 뒤 홈페이지에 반영됩니다.'}`); watchDeploy(r.commit); };

  // ── 사진: 큰 사진은 줄여서(WebP, 안 되면 JPEG) 올린다
  const previews = {};   // 방금 올린 사진 경로 → 미리보기(배포 전에도 보이게)
  const readURL = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('사진을 열지 못했습니다')); i.src = src; });
  async function prepImage(file, maxW = 1600) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('JPG·PNG·WebP 사진만 올릴 수 있습니다');
    const img = await loadImg(await readURL(file));
    const s = Math.min(1, maxW / img.naturalWidth), w = Math.round(img.naturalWidth * s), ht = Math.round(img.naturalHeight * s);
    const c = document.createElement('canvas'); c.width = w; c.height = ht;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, ht); x.drawImage(img, 0, 0, w, ht);
    let data = c.toDataURL('image/webp', 0.84); if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/jpeg', 0.86);
    return { data };
  }
  const pickFile = () => new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => ok(i.files[0]); i.click(); });
  const imgSrc = v => !v ? '' : typeof v === 'object' ? v.data : previews[v] || BASE + 'assets/img/' + v;

  // ── 아이콘
  const ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    notice: '<path d="M4 9v6h3l6 4V5L7 9z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    faq: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
    coach: '<circle cx="12" cy="7" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>',
    won: '<path d="M4 6l3 12 3-9 2 0 3 9 3-12M3 10h18M3 14h18"/>',
    pop: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 7h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>',
    log: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-3.8-5.9"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    sms: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', print: '<path d="M7 9V3h10v6M7 18H4v-8h16v8h-3"/><path d="M7 14h10v7H7z"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  };
  const ico = k => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const NAV = [
    ['현황', [['', '대시보드', 'home'], ['leads', '접수 관리', 'inbox', 'badge'], ['stats', '접속 통계', 'chart']]],
    ['게시판', [['blog', '블로그', 'pen'], ['notices', '공지사항', 'notice'], ['gallery', '갤러리', 'photo'], ['used', '중고장비', 'tag'], ['faq', '자주 묻는 질문', 'faq']]],
    ['운영 정보', [['instructors', '강사진', 'coach'], ['prices', '요금 관리', 'won'], ['popup', '팝업', 'pop'], ['site', '기본정보', 'info']]],
  ];
  const OWNER_ONLY = ['blog'];   // 게시판 안에 있지만 관리자(세느루)에게만 보이는 메뉴
  const OWNER_NAV = [['tags', '추적 코드', 'code'], ['log', '작업 기록', 'log'], ['users', '계정 관리', 'users']];
  const route = () => location.hash.replace(/^#\/?/, '').split('?')[0].split('/');
  const badge = () => newCount ? `<span class="badge" data-newbadge>${newCount > 99 ? '99+' : newCount}</span>` : '<span class="badge" data-newbadge hidden></span>';

  function shell(title, o = {}) {
    const r = route()[0], isOwner = ME.user.role === 'owner';
    const link = ([k, t, i, b]) => `<a href="#/${k}" class="${r === k ? 'on' : ''}">${ico(i)}<span>${t}</span>${b ? badge() : ''}</a>`;
    $('#app').innerHTML = `<div class="shell"><aside class="side" id="side"><a class="brand" href="#/"><img src="${BASE}assets/img/brand/logo.png" alt="뽀드득"><span>관리자</span></a>
      <button class="navbtn" id="navbtn" type="button" aria-expanded="false">${ico('menu')}<span>메뉴</span>${badge()}</button>
      <nav id="side-nav">${NAV.map(([g, list]) => `<p class="grp">${g}</p>${list.filter(x => isOwner || !OWNER_ONLY.includes(x[0])).map(link).join('')}`).join('')}
        ${isOwner ? `<p class="grp own">관리자 전용</p>${OWNER_NAV.map(link).join('')}` : ''}
        <div class="bottom">${link(['me', '내 계정', 'me'])}<a href="${BASE}" target="_blank" rel="noopener">${ico('out')}<span>홈페이지 보기</span></a><a href="#" id="logout">${ico('logout')}<span>로그아웃</span></a></div></nav>
      <p class="who"><b>${h(ME.user.name)}</b>${h(ME.user.roleName)} · ${h(ME.user.id)}</p></aside>
      <main class="main"><div class="top"><div class="tt">${o.back ? `<a class="back" href="${o.back[0]}">← ${h(o.back[1])}</a>` : ''}<h1>${h(title)}</h1>${o.desc ? `<p>${o.desc}</p>` : ''}</div><div class="tools">${o.tool || ''}<span id="deploy" class="deploy ${deploy.state}" ${deploy.text ? '' : 'hidden'}>${h(deploy.text)}</span></div></div>
      ${o.content && !ME.storeReady ? '<div class="box bad">저장소 연결이 안 되어 있어 사이트 내용을 저장할 수 없습니다. 관리자에게 알려 주세요(서버 변수 GITHUB_TOKEN).</div>' : ''}
      <div id="view"><p class="help">불러오는 중…</p></div></main></div>`;
    $('#navbtn').onclick = () => { const open = $('#side').classList.toggle('open'); $('#navbtn').setAttribute('aria-expanded', open); $('#navbtn span').textContent = open ? '닫기' : '메뉴'; };
    $('#side-nav').addEventListener('click', e => { if (e.target.closest('a')) $('#side').classList.remove('open'); });
    $('#logout').onclick = async e => { e.preventDefault(); if (!leaveOk()) return; await api('POST', '/api/admin/logout').catch(() => {}); ME.user = null; render(); };
    return $('#view');
  }
  const leaveOk = () => !dirty || confirm('저장하지 않은 내용이 있습니다. 나가시겠어요?');

  // ── 로그인
  function loginView() {
    $('#app').innerHTML = `<div class="login-wrap"><div class="login-art" style="background-image:url(${BASE}assets/video/hero-poster.jpg)"><b>접수 확인부터 공지·요금 수정까지<br>한 화면에서</b><p>뽀드득 홈페이지 관리자</p></div>
      <form class="login" id="lf"><img src="${BASE}assets/img/brand/logo.png" alt="뽀드득"><h1>관리자 로그인</h1><p class="sub">받은 아이디와 비밀번호를 입력해 주세요.</p>
      ${ME.store === 'demo' ? '<div class="box info"><b>미리보기 데모</b> — 아이디 <b>demo</b>, 비밀번호 <b>demo</b> 로 들어가 보세요. 시험용 데이터이고 저장되지 않습니다.</div>' : ME.ready ? '' : '<div class="box warn">어드민 초기 설정 전입니다(계정·SESSION_SECRET). 관리자에게 알려 주세요.</div>'}
      <div class="form-stack"><label class="fld"><span>아이디</span><input class="in" name="id" autocomplete="username" required autocapitalize="off"></label>
      <label class="fld"><span>비밀번호</span><input class="in" name="pw" type="password" autocomplete="current-password" required></label>
      <button class="btn pri" type="submit">로그인</button></div></form></div>`;
    $('#lf').onsubmit = async e => {
      e.preventDefault(); const f = e.target, b = f.querySelector('button'); b.disabled = true;
      try { await api('POST', '/api/admin/login', { id: f.id.value, pw: f.pw.value }); ME = await api('GET', '/api/admin/me'); render(); startPoll(); }
      catch (err) { fail(err); b.disabled = false; }
    };
    $('#lf [name=id]').focus();
  }

  // ── 새 접수 알림(45초마다): 배지 + 토스트 + (허용 시) 알림
  let poller = null;
  function startPoll() {
    clearInterval(poller);
    const tick = async () => {
      if (!ME || !ME.user) return;
      try {
        const p = await api('GET', '/api/admin/poll');
        if (lastId && p.lastId > lastId) {
          const n = p.lastId - lastId; toast(`새 접수 ${n}건이 들어왔습니다`, 6000);
          if ('Notification' in window && Notification.permission === 'granted') try { new Notification('뽀드득 새 접수', { body: `새 접수 ${n}건 — 관리자 화면에서 확인하세요`, icon: '/favicon.ico' }); } catch { /* 무시 */ }
          if (route()[0] === '' || route()[0] === 'leads') render();
        }
        lastId = p.lastId; newCount = p.newCount;
        $$('[data-newbadge]').forEach(b => { b.textContent = newCount > 99 ? '99+' : newCount; b.hidden = !newCount; });
      } catch { /* 무시 */ }
    };
    tick(); poller = setInterval(tick, 45000);
  }

  // ── 그래프(막대): rows [{label, v, v2?}]
  function bars(rows, { h: H = 170, two = false } = {}) {
    const W = 700, pad = 22, n = rows.length, max = Math.max(1, ...rows.map(r => Math.max(r.v, r.v2 || 0)));
    const bw = (W - pad) / n, inner = two ? bw * .34 : bw * .58;
    const y = v => H - 22 - (v / max) * (H - 40);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="날짜별 그래프"><line x1="${pad}" x2="${W}" y1="${H - 22}" y2="${H - 22}" stroke="#E5E7EB"/><text x="0" y="14">${num(max)}</text>`;
    rows.forEach((r, i) => {
      const x = pad + i * bw + (bw - (two ? inner * 2 + 3 : inner)) / 2;
      s += `<rect class="bar v" x="${x}" y="${y(r.v)}" width="${inner}" height="${H - 22 - y(r.v)}" rx="3"><title>${h(r.label)}: ${num(r.v)}</title></rect>`;
      if (two) s += `<rect class="bar l" x="${x + inner + 3}" y="${y(r.v2)}" width="${inner}" height="${H - 22 - y(r.v2)}" rx="3"><title>${h(r.label)}: 접수 ${num(r.v2)}</title></rect>`;
      if (n <= 16 || i % Math.ceil(n / 12) === 0) s += `<text x="${pad + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${h(r.label)}</text>`;
    });
    return s + '</svg>';
  }
  const rank = (obj, cls = '', limit = 8, fmt = k => k) => {
    const e = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, limit); if (!e.length) return '<p class="help">아직 기록이 없습니다.</p>';
    const max = e[0][1]; return `<ul class="rank ${cls}">${e.map(([k, v]) => `<li><span>${h(fmt(k))}</span><b>${num(v)}</b><span class="barl"><i style="width:${Math.max(4, v / max * 100)}%"></i></span></li>`).join('')}</ul>`;
  };
  const md = d => d.slice(5).replace('-', '.');
  const pill = l => `<span class="pill st-${l.status}">${h(l.statusName)}</span>`;
  const tp = l => `<span class="tp tp-${l.type}">${h(l.typeName)}</span>`;

  // ── 대시보드
  async function dashboard() {
    const v = shell('대시보드', { desc: `${h(ME.user.name)}님, 오늘 들어온 접수와 홈페이지 방문을 한눈에 확인하세요.`, tool: `<a class="btn sm" href="${BASE}" target="_blank" rel="noopener">${ico('out')}홈페이지</a>` });
    const d = await api('GET', '/api/admin/dashboard');
    const c = d.counts, warn = [];
    if (!ME.dbPersistent) warn.push('접수 DB가 서버 볼륨(DATA_DIR)에 연결되어 있지 않아 다시 배포하면 접수 기록이 사라질 수 있습니다. 관리자에게 알려 주세요.');
    if (!d.statsPersistent && ME.user.role === 'owner') warn.push('방문 집계 저장소(DATA_DIR)가 없어 서버를 다시 시작하면 통계가 초기화됩니다.');
    const uv7 = d.visits.slice(-7).reduce((a, b) => a + b.uv, 0);
    v.innerHTML = `${warn.map(w => `<div class="box warn">${h(w)}</div>`).join('')}
      <div class="kpis">
        <a class="kpi hot" href="#/leads?status=new"><span>${ico('bell')}확인할 새 접수</span><b>${num(c.byStatus.new)}건</b><small>아직 연락하지 않은 접수</small></a>
        <a class="kpi" href="#/leads"><span>오늘 접수</span><b>${num(c.today)}건</b><small>이번 달 ${num(c.month)}건 · 전체 ${num(c.total)}건</small></a>
        <a class="kpi" href="#/stats"><span>최근 7일 방문자</span><b>${num(uv7)}명</b><small>14일 ${num(d.totals.uv)}명 · 페이지 ${num(d.totals.pv)}회</small></a>
        <a class="kpi" href="#/stats"><span>전화 버튼 클릭(14일)</span><b>${num(d.totals.calls)}회</b><small>홈페이지에서 전화 연결</small></a>
      </div>
      <div class="cols">
        <section class="card"><div class="card-h"><h2>최근 접수</h2><a class="btn sm" href="#/leads">전체 보기</a></div>
          ${d.recent.length ? `<ul class="recent">${d.recent.map(l => `<li data-lead="${l.id}">${pill(l)}${tp(l)}<span class="nm">${h(l.name)}</span><span class="meta">${h(l.use_date ? md(l.use_date) + ' 이용 · ' : '')}${h(l.created.slice(5, 16))}</span></li>`).join('')}</ul>` : '<div class="empty"><b>아직 접수가 없습니다</b>홈페이지의 빠른 문의·견적·예약이 여기에 쌓입니다.</div>'}</section>
        <section class="card"><div class="card-h"><h2>최근 14일</h2></div>${bars(d.visits.map((x, i) => ({ label: md(x.date), v: x.uv, v2: d.daily[i] ? d.daily[i].n : 0 })), { two: true })}
          <p class="legend"><span><i style="background:#1E2A44"></i>방문자</span><span><i style="background:#E3262B"></i>접수</span></p></section>
      </div>
      <section class="card"><div class="card-h"><h2>바로 가기</h2></div><div class="quick">
        <a href="#/notices">${ico('notice')}공지 쓰기</a><a href="#/gallery">${ico('photo')}갤러리 사진 올리기</a><a href="#/prices">${ico('won')}요금 수정</a><a href="#/popup">${ico('pop')}팝업 띄우기</a></div>
        ${'Notification' in window && Notification.permission === 'default' ? `<p class="help" style="margin-top:14px"><button class="btn sm" id="notiOn">${ico('bell')}새 접수 알림 켜기</button> 이 화면을 열어 두면 새 접수가 들어올 때 알려 드립니다.</p>` : ''}</section>`;
    v.addEventListener('click', e => { const li = e.target.closest('[data-lead]'); if (li) openLead(li.dataset.lead); });
    const nb = $('#notiOn'); if (nb) nb.onclick = async () => { const p = await Notification.requestPermission(); toast(p === 'granted' ? '새 접수 알림을 켰습니다' : '알림이 허용되지 않았습니다'); nb.parentElement.remove(); };
  }

  // ── 접수 관리
  const qs = () => new URLSearchParams(location.hash.split('?')[1] || '');
  async function leads() {
    const q = qs(), status = q.get('status') || '', type = q.get('type') || '', search = q.get('q') || '', page = +q.get('page') || 1;
    const v = shell('접수 관리', { desc: '홈페이지에서 들어온 빠른 문의·견적문의·예약입니다. 눌러서 연락 상태와 메모를 남기세요.', tool: `<a class="btn sm" href="/api/admin/leads.csv?status=${encodeURIComponent(status)}&type=${encodeURIComponent(type)}">${ico('dl')}엑셀(CSV) 내려받기</a><button class="btn sm pri" type="button" id="pdfBtn">${ico('print')}PDF 출력</button>` });
    $('#pdfBtn').onclick = () => printDay();
    const d = await api('GET', `/api/admin/leads?status=${encodeURIComponent(status)}&type=${encodeURIComponent(type)}&q=${encodeURIComponent(search)}&page=${page}`);
    const c = d.counts, link = o => '#/leads?' + new URLSearchParams(Object.entries({ status, type, q: search, ...o }).filter(([, x]) => x)).toString();
    const pages = Math.max(1, Math.ceil(d.total / d.size));
    v.innerHTML = `<div class="filters">
        <div class="seg">${[['', '전체', c.total], ...Object.entries(ME.status).map(([k, n]) => [k, n, c.byStatus[k]])].map(([k, n, cnt]) => `<a href="${link({ status: k, page: '' })}" class="${status === k ? 'on' : ''}">${h(n)} <small>${num(cnt)}</small></a>`).join('')}</div>
        <div class="seg">${[['', '모든 종류'], ...Object.entries(ME.types)].map(([k, n]) => `<a href="${link({ type: k, page: '' })}" class="${type === k ? 'on' : ''}">${h(n)}</a>`).join('')}</div>
        <form class="search" id="sf">${ico('search')}<input class="in" name="q" value="${h(search)}" placeholder="이름·연락처·메모 검색" enterkeyhint="search"></form></div>
      <section class="card" style="padding:8px 10px">${d.items.length ? `
        <table class="tbl"><thead><tr><th>상태</th><th>종류</th><th>이름</th><th>연락처</th><th>이용날짜 · 스키장</th><th>요청</th><th>접수일시</th></tr></thead><tbody>
        ${d.items.map(l => `<tr class="row${l.status === 'new' ? ' is-new' : ''}" data-lead="${l.id}"><td>${pill(l)}</td><td>${tp(l)}</td><td class="nm">${h(l.name)}</td><td class="ph">${h(l.phone)}</td><td class="sm">${h([l.use_date, l.resort].filter(Boolean).join(' · ') || '—')}</td><td class="sm">${h(leadBrief(l)).slice(0, 40) || '—'}</td><td class="dt">${h(l.created.slice(0, 16))}</td></tr>`).join('')}
        </tbody></table>
        <div class="lcards">${d.items.map(l => `<div class="lcard${l.status === 'new' ? ' is-new' : ''}" data-lead="${l.id}"><div class="r1">${tp(l)}<span class="nm">${h(l.name)}</span>${pill(l)}</div><div class="r2">${h(l.phone)} · ${h([l.use_date && md(l.use_date) + ' 이용', l.resort].filter(Boolean).join(' · ') || '날짜 미정')}</div><div class="r2">${h(l.created.slice(5, 16))} 접수${l.admin_memo ? ' · 메모 있음' : ''}</div></div>`).join('')}</div>`
        : `<div class="empty"><b>${search || status || type ? '조건에 맞는 접수가 없습니다' : '아직 접수가 없습니다'}</b>${search || status || type ? '<a href="#/leads">필터 지우기</a>' : '홈페이지의 빠른 문의·견적·예약이 여기에 쌓입니다.'}</div>`}</section>
      ${pages > 1 ? `<div class="pager">${page > 1 ? `<a class="btn sm" href="${link({ page: page - 1 })}">이전</a>` : ''}<span>${page} / ${pages}</span>${page < pages ? `<a class="btn sm" href="${link({ page: page + 1 })}">다음</a>` : ''}</div>` : ''}
      <p class="help">개인정보 보호: 완료·취소된 접수는 상담 종료 6개월 뒤 자동으로 지워집니다(개인정보처리방침). 엑셀 파일은 업무 PC 에만 보관해 주세요.</p>`;
    $('#sf').onsubmit = e => { e.preventDefault(); location.hash = link({ q: e.target.q.value.trim(), page: '' }); };
    v.addEventListener('click', e => { const r = e.target.closest('[data-lead]'); if (r) openLead(r.dataset.lead); });
    const open = q.get('open'); if (open) openLead(open);
  }
  // ── 날짜별 예약자 명단 PDF 출력(A4 가로 1장) — 브라우저 인쇄 창에서 「PDF로 저장」 또는 바로 인쇄
  const WEEK = '일월화수목금토';
  const dayName = d => `${d.replace(/-/g, '.')} (${WEEK[new Date(d + 'T00:00:00Z').getUTCDay()]})`;
  async function printDay() {
    const el = document.createElement('div'); el.className = 'drawer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    let dates = []; try { dates = (await api('GET', `/api/admin/leads/day?date=`)).dates; } catch (e) { return fail(e); }
    const def = dates[0] ? dates[0].d : today();
    el.innerHTML = `<div class="pane"><div class="pane-h"><button class="btn ghost sm x" data-x aria-label="닫기">${ico('x')}</button><h2>날짜별 예약자 명단 출력</h2>
      <p class="help" style="margin:6px 0 0">고른 이용날짜의 예약을 A4 가로 1장으로 정리합니다. 인쇄 창이 열리면 대상(프린터)에서 <b>PDF로 저장</b>을 고르세요.</p></div>
      <div class="pane-b"><label class="fld"><span>이용날짜</span><input class="in" type="date" data-date value="${def}"></label>
      ${dates.length ? `<div><p class="lbl">예약이 있는 날짜</p><div class="dchips">${dates.map(x => `<button type="button" data-d="${x.d}" class="${x.d === def ? 'on' : ''}">${h(md(x.d))} <small>${num(x.n)}건</small></button>`).join('')}</div></div>` : '<p class="help">오늘 이후 예약이 아직 없습니다. 날짜를 직접 고를 수 있습니다.</p>'}
      <div><p class="lbl">포함할 접수</p><label class="chk"><input type="checkbox" data-quote> 견적문의도 함께 넣기</label><label class="chk"><input type="checkbox" data-cancel> 취소된 예약도 넣기</label></div>
      <button class="btn pri" data-go>${ico('print')}PDF 출력</button></div></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 200); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    el.addEventListener('click', async e => {
      if (e.target === el || e.target.closest('[data-x]')) return close();
      const chip = e.target.closest('[data-d]');
      if (chip) { $('[data-date]', el).value = chip.dataset.d; $$('[data-d]', el).forEach(b => b.classList.toggle('on', b === chip)); return; }
      if (!e.target.closest('[data-go]')) return;
      const date = $('[data-date]', el).value; if (!date) return toast('이용날짜를 골라 주세요');
      const types = ['reserve', ...($('[data-quote]', el).checked ? ['quote'] : [])].join(',');
      try { const d = await api('GET', `/api/admin/leads/day?date=${date}&types=${types}&cancel=${$('[data-cancel]', el).checked ? 1 : 0}`);
        if (!d.items.length) return toast(`${dayName(date)} 예약이 없습니다`);
        close(); setTimeout(() => printSheet(date, d.items), 220); } catch (err) { fail(err); }
    });
    $('[data-date]', el).onchange = e => $$('[data-d]', el).forEach(b => b.classList.toggle('on', b.dataset.d === e.target.value));
  }
  function printSheet(date, items) {
    const arr = x => Array.isArray(x) ? x.join(', ') : x || '';
    const people = items.reduce((a, l) => a + (parseInt(l.people) || 0), 0);
    const byResort = Object.entries(items.reduce((a, l) => (a[l.resort || '스키장 미정'] = (a[l.resort || '스키장 미정'] || 0) + 1, a), {})).map(([k, n]) => `${k} ${n}건`).join(' · ');
    const now = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
    const row = (l, i) => { const d = l.detail || {};
      const gear = [d.ski && '스키: ' + arr(d.ski), d.board && '보드: ' + arr(d.board), d.wear && '의류: ' + arr(d.wear)].filter(Boolean).join(' / ');
      const lesson = d.lesson ? [d.lesson, d.lessonPeople, d.lessonHours].filter(Boolean).join(' · ') : '';
      const size = [d.qty, d.height && '키 ' + d.height, d.foot && '발 ' + d.foot].filter(Boolean).join(' · ');
      return `<tr class="${l.status === 'cancel' ? 'cx' : ''}"><td class="c">${i + 1}</td><td class="nm">${h(l.name)}${l.type !== 'reserve' ? `<small>${h(l.typeName)}</small>` : ''}</td><td class="ph">${h(l.phone)}</td>
        <td>${h((l.resort || '').replace('스키장', ''))} <small class="tm">${h(l.time || '')}</small></td><td class="c">${h(l.people ? l.people + '명' : '')}</td>
        <td>${h(gear)}</td><td>${h(lesson)}</td><td>${h(size)}</td>
        <td class="memo">${h(l.memo || '')}${l.admin_memo ? `<em>메모: ${h(l.admin_memo)}</em>` : ''}</td><td class="c st">${h(l.statusName)}</td><td class="ck"></td><td class="ck"></td></tr>`; };
    let sheet = $('#printSheet'); if (sheet) sheet.remove();
    sheet = document.createElement('div'); sheet.id = 'printSheet';
    sheet.innerHTML = `<div class="ps-in"><header><div><b class="ps-brand">뽀드득</b><h1>예약자 명단 — ${h(dayName(date))}</h1></div>
      <p>총 <b>${num(items.length)}건</b>${people ? ` · 인원 <b>${num(people)}명</b>` : ''} · ${h(byResort)}<br><span>출력 ${h(now)} · ${h(ME.user.name)}</span></p></header>
      <table><colgroup><col style="width:2.6%"><col style="width:7%"><col style="width:8.6%"><col style="width:15%"><col style="width:3.8%"><col style="width:18%"><col style="width:8%"><col style="width:12%"><col><col style="width:4.6%"><col style="width:3.4%"><col style="width:3.4%"></colgroup>
      <thead><tr><th>No</th><th>이름</th><th>연락처</th><th>스키장·타임</th><th>인원</th><th>장비</th><th>강습</th><th>수량·키·발</th><th>요청사항 · 관리 메모</th><th>상태</th><th>수령</th><th>반납</th></tr></thead>
      <tbody>${items.map(row).join('')}</tbody></table>
      <footer>뽀드득 · 평창군 대관령면 올림픽로 238 · 033-336-9884 — 고객 개인정보가 담긴 문서입니다. 사용 후 파기해 주세요.</footer></div>`;
    document.body.appendChild(sheet);
    // 1장에 맞추기: A4 가로 인쇄 영역(277×190mm)에 들어가도록 글자 크기를 줄인다
    // 표 폭은 A4 그대로 두고 글자 크기만 줄여 높이를 맞춘다(12px → 최소 7px, 그보다 많으면 2장)
    const inner = $('.ps-in', sheet), H = 186 * 3.7795, tall = () => inner.getBoundingClientRect().height > H;
    sheet.classList.add('measure');
    let fs = 12; inner.style.fontSize = fs + 'px';
    while (tall() && fs > 7) { fs = Math.round((fs - .25) * 4) / 4; inner.style.fontSize = fs + 'px'; }
    const fits = !tall();
    sheet.classList.remove('measure');
    if (!fits) toast(`${items.length}건이라 1장에 다 들어가지 않아 2장 이상으로 나뉩니다`, 6000);
    const prevTitle = document.title; document.title = `뽀드득_예약자명단_${date}`;
    const done = () => { document.title = prevTitle; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 60);
  }
  const DETAIL_NAMES = { topic: '문의 항목', ski: '스키 장비', board: '보드 장비', wear: '의류', lesson: '강습', lessonPeople: '강습 인원', lessonHours: '강습 시간', qty: '장비 수량', height: '키', foot: '발 사이즈' };
  const leadBrief = l => [l.time, ...Object.entries(l.detail || {}).map(([k, x]) => Array.isArray(x) ? x.join(', ') : x), l.memo].filter(Boolean).join(' · ');
  async function openLead(id) {
    let l; try { l = (await api('GET', `/api/admin/leads/${id}`)).lead; } catch (e) { return fail(e); }
    const el = document.createElement('div'); el.className = 'drawer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    const tel = l.phone.replace(/\D/g, '');
    const rows = [['접수일시', l.created], ['이용날짜', l.use_date], ['스키장', l.resort], ['이용타임', l.time], ['인원', l.people && l.people + '명'],
      ...Object.entries(l.detail || {}).map(([k, x]) => [DETAIL_NAMES[k] || k, Array.isArray(x) ? x.join(', ') : x]), ['고객 요청', l.memo], ['보낸 페이지', l.page], ['마지막 처리', l.handled_by && `${l.handled_by} · ${l.updated}`]].filter(r => r[1]);
    el.innerHTML = `<div class="pane"><div class="pane-h"><button class="btn ghost sm x" data-x aria-label="닫기">${ico('x')}</button>
      <p style="margin:0 0 6px">${tp(l)} <span class="muted">#${l.id}</span></p><h2>${h(l.name)} ${pill(l)}</h2><p class="ph" style="margin:4px 0 0;font-size:17px;font-weight:700">${h(l.phone)}</p>
      <div class="calls"><a class="btn pri" href="tel:${tel}">${ico('phone')}전화하기</a><a class="btn" href="sms:${tel}">${ico('sms')}문자 보내기</a></div></div>
      <div class="pane-b"><div><p class="lbl">연락 상태</p><div class="stbtns">${Object.entries(ME.status).map(([k, n]) => `<button type="button" class="st-${k}${l.status === k ? ' on' : ''}" data-st="${k}">${h(n)}</button>`).join('')}</div></div>
      <dl class="dl">${rows.map(([k, x]) => `<dt>${h(k)}</dt><dd>${h(x)}</dd>`).join('')}</dl>
      ${l.summary ? `<div><p class="lbl">고객이 보낸 내용 그대로</p><pre class="sumbox">${h(l.summary)}</pre></div>` : ''}
      <label class="fld"><span>관리 메모 <small>고객에게는 보이지 않습니다</small></span><textarea class="in" data-memo placeholder="예: 11/12 통화, 초급자 스키 2대·강습 2시간 확정">${h(l.admin_memo || '')}</textarea></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" data-savememo>메모 저장</button><button class="btn danger" data-del style="margin-left:auto">${ico('trash')}접수 삭제</button></div></div></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    let changed = false;
    const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 200); document.removeEventListener('keydown', esc); if (changed && route()[0] === 'leads') leads(); else if (changed && route()[0] === '') dashboard(); };
    const esc = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    el.addEventListener('click', async e => {
      if (e.target === el || e.target.closest('[data-x]')) return close();
      const st = e.target.closest('[data-st]');
      if (st) { try { const r = await api('POST', `/api/admin/leads/${id}`, { status: st.dataset.st }); changed = true; $$('[data-st]', el).forEach(b => b.classList.toggle('on', b === st)); $('.pane-h h2 .pill', el).outerHTML = pill(r.lead); toast(`'${r.lead.statusName}'(으)로 바꿨습니다`); } catch (err) { fail(err); } return; }
      if (e.target.closest('[data-savememo]')) { try { await api('POST', `/api/admin/leads/${id}`, { adminMemo: $('[data-memo]', el).value }); changed = true; toast('메모를 저장했습니다'); } catch (err) { fail(err); } return; }
      if (e.target.closest('[data-del]')) { if (!confirm(`${l.name}님의 접수를 지울까요? 되돌릴 수 없습니다.`)) return; try { await api('DELETE', `/api/admin/leads/${id}`); changed = true; toast('접수를 지웠습니다'); close(); } catch (err) { fail(err); } }
    });
  }

  // ── 목록 편집기(공지·갤러리·중고·FAQ·강사진)
  const LISTS = {
    notices: { title: '공지사항', desc: '홈페이지 공지사항과 메인 화면 공지 목록에 보입니다. 위에 있는 공지가 가장 먼저 보입니다.', layout: 'stack', addTop: true,
      fields: [{ k: 'title', label: '제목', full: true }, { k: 'date', label: '날짜', type: 'date' }, { k: 'body', label: '내용', type: 'textarea', full: true, hint: '줄을 바꾸면 문단이 나뉩니다' }],
      blank: () => ({ title: '', date: today(), body: '' }), load: it => ({ ...it, body: Array.isArray(it.body) ? it.body.join('\n') : it.body }), name: it => it.title },
    gallery: { title: '갤러리', desc: '홈페이지 갤러리와 메인 화면에 보입니다(메인은 위에서 8장). 사진은 자동으로 줄여서 올라갑니다.', layout: 'cards', addTop: true, img: 'img',
      fields: [{ k: 'title', label: '사진 설명' }, { k: 'cat', label: '분류', type: 'select', opts: () => ME.galleryCats.map(c => [c, c]) }, { k: 'date', label: '날짜', type: 'date' }],
      blank: () => ({ img: '', title: '', cat: ME.galleryCats[0], date: today() }), name: it => it.title },
    used: { title: '중고장비', desc: '중고장비 직거래장터에 보입니다. 팔린 상품은 「판매완료」를 켜 두거나 지우세요.', layout: 'rows', addTop: true, img: 'img',
      fields: [{ k: 'title', label: '제목' }, { k: 'price', label: '가격(원)', type: 'number' }, { k: 'qty', label: '수량', type: 'number' }, { k: 'date', label: '등록일', type: 'date' }, { k: 'body', label: '설명', type: 'textarea', full: true }, { k: 'sold', label: '판매완료', type: 'toggle' }],
      blank: () => ({ img: '', title: '', price: 0, qty: 1, date: today(), body: '', sold: false }), name: it => it.title },
    faq: { title: '자주 묻는 질문', desc: '질문과 답은 홈페이지 FAQ 와 검색엔진·AI 답변용 구조화 데이터(FAQPage)에 같이 들어갑니다. 답의 첫 문장에 핵심(금액·시간)을 쓰면 AI 답변에 잘 인용됩니다.', layout: 'stack',
      fields: [{ k: 'q', label: '질문', full: true }, { k: 'a', label: '답변', type: 'textarea', full: true }, { k: 'pages', label: '보일 페이지', type: 'checks', opts: () => ME.faqPages, full: true }],
      blank: () => ({ q: '', a: '', pages: ['home'] }), name: it => it.q },
    instructors: { title: '강사진', desc: '강사진 소개 페이지와 메인 화면 「강사진 소개」에 보입니다. 사진은 자격증·프로필 사진을 올리세요(자격 번호는 가려서).', layout: 'cards', img: 'img',
      fields: [{ k: 'name', label: '이름', ph: '예: 홍길동 강사' }, { k: 'cred', label: '자격', ph: '대한스키지도자연맹(KSIA) 자격 강사' }, { k: 'career', label: '경력 한 줄', ph: '예: 데몬스트레이터 · 강습 10년' }],
      blank: () => ({ img: '', name: '', cred: '대한스키지도자연맹(KSIA) 자격 강사', career: '' }), name: it => it.name || it.cred },
  };
  function fieldHtml(f, it, i) {
    const v = it[f.k], id = `f-${i}-${f.k}`, lab = `<span>${h(f.label)}${f.hint ? `<small>${h(f.hint)}</small>` : ''}</span>`, style = f.full ? ' style="grid-column:1/-1"' : '';
    if (f.type === 'textarea') return `<label class="fld"${style}>${lab}<textarea class="in" data-f="${f.k}" id="${id}">${h(v)}</textarea></label>`;
    if (f.type === 'select') return `<label class="fld"${style}>${lab}<select class="in" data-f="${f.k}">${f.opts().map(([k, n]) => `<option value="${h(k)}"${k === v ? ' selected' : ''}>${h(n)}</option>`).join('')}</select></label>`;
    if (f.type === 'toggle') return `<label class="toggle"${style}><input type="checkbox" data-f="${f.k}"${v ? ' checked' : ''}>${h(f.label)}</label>`;
    if (f.type === 'checks') return `<div class="fld"${style}>${lab}<div class="chkset">${f.opts().map(([k, n]) => `<label><input type="checkbox" data-fc="${f.k}" value="${h(k)}"${(v || []).includes(k) ? ' checked' : ''}>${h(n)}</label>`).join('')}</div></div>`;
    return `<label class="fld"${style}>${lab}<input class="in${f.type === 'number' ? ' num' : ''}" data-f="${f.k}" type="${f.type === 'date' ? 'date' : 'text'}"${f.type === 'number' ? ' inputmode="numeric"' : ''} value="${h(f.type === 'number' ? (v || 0) : v)}" placeholder="${h(f.ph || '')}"></label>`;
  }
  async function listEditor(key) {
    const S = LISTS[key];
    const v = shell(S.title, { desc: S.desc, content: true });
    const d = await api('GET', `/api/admin/content/${key}`);
    let list = d.value.map(it => S.load ? S.load(clone(it)) : clone(it)); const fresh = new Set();
    const draw = () => {
      v.innerHTML = `<div class="savebar" style="position:static;margin:0 0 14px;padding:0;background:none"><button class="btn dark" data-add>${ico('plus')}새로 추가</button><span class="help" style="margin:0">총 ${list.length}개</span></div>
      <div class="items ${S.layout === 'cards' ? 'cardgrid' : S.layout === 'rows' ? 'rows' : ''}">${list.length ? list.map((it, i) => `<div class="item${fresh.has(it) ? ' new' : ''}" data-i="${i}">
        <div class="item-h"><span class="no">${i + 1}</span><button class="btn xs ghost" data-mv="-1" title="위로" ${i ? '' : 'disabled'}>${ico('up')}</button><button class="btn xs ghost" data-mv="1" title="아래로" ${i < list.length - 1 ? '' : 'disabled'}>${ico('down')}</button><button class="btn xs ghost danger" data-rm title="삭제">${ico('trash')}</button></div>
        ${S.img ? `<div class="thumb">${it[S.img] ? `<img src="${h(imgSrc(it[S.img]))}" alt="">` : '사진을 올려 주세요'}<button class="btn sm up" data-pic>${ico('cam')}${it[S.img] ? '바꾸기' : '사진 올리기'}</button></div>` : ''}
        <div class="${S.layout === 'stack' ? 'grid2' : 'form-stack'}" style="${S.layout === 'stack' ? '' : 'gap:10px'}">${S.fields.map(f => fieldHtml(f, it, i)).join('')}</div></div>`).join('') : `<div class="empty card"><b>아직 등록된 항목이 없습니다</b>「새로 추가」를 눌러 시작하세요.</div>`}</div>
      <div class="savebar"><button class="btn pri" data-save>저장하고 홈페이지에 반영</button>${d.changed ? '<button class="btn ghost sm" data-reset>처음 값으로 되돌리기</button>' : ''}<span class="dirty" ${dirty ? '' : 'hidden'}>저장하지 않은 변경이 있습니다</span></div>`;
    };
    const markDirty = () => { dirty = true; const x = $('.dirty', v); if (x) x.hidden = false; };
    draw();
    v.addEventListener('input', e => {
      const box = e.target.closest('[data-i]'); if (!box) return; const it = list[+box.dataset.i];
      if (e.target.dataset.f) { const f = S.fields.find(x => x.k === e.target.dataset.f); it[f.k] = f.type === 'toggle' ? e.target.checked : f.type === 'number' ? +e.target.value.replace(/\D/g, '') || 0 : e.target.value; }
      if (e.target.dataset.fc) it[e.target.dataset.fc] = $$(`[data-fc="${e.target.dataset.fc}"]:checked`, box).map(x => x.value);
      markDirty();
    });
    v.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      const box = b.closest('[data-i]'), i = box ? +box.dataset.i : -1;
      if (b.dataset.add != null) { const it = S.blank(); fresh.add(it); if (S.addTop) list.unshift(it); else list.push(it); markDirty(); draw(); const first = $(S.addTop ? '.item' : '.item:last-child', v); first && first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (b.dataset.mv) { const j = i + +b.dataset.mv; [list[i], list[j]] = [list[j], list[i]]; markDirty(); draw(); return; }
      if (b.dataset.rm != null) { if (!confirm(`「${S.name(list[i]) || (i + 1) + '번째'}」을(를) 지울까요? (저장해야 홈페이지에서 빠집니다)`)) return; list.splice(i, 1); markDirty(); draw(); return; }
      if (b.dataset.pic != null) { const f = await pickFile(); if (!f) return; try { b.disabled = true; list[i][S.img] = await prepImage(f); markDirty(); draw(); } catch (err) { fail(err); b.disabled = false; } return; }
      if (b.dataset.save != null) {
        b.disabled = true; b.textContent = '저장 중…';
        try {
          const ups = list.map(it => it[S.img] && typeof it[S.img] === 'object' ? it[S.img].data : null);
          const r = await api('POST', `/api/admin/content/${key}`, { value: list });
          r.value.forEach((it, k) => { if (S.img && ups[k] && it[S.img]) previews[it[S.img]] = ups[k]; });
          list = r.value.map(it => S.load ? S.load(clone(it)) : clone(it)); fresh.clear(); d.changed = true; saved(r, S.title); draw();
        } catch (err) { fail(err); b.disabled = false; b.textContent = '저장하고 홈페이지에 반영'; }
        return;
      }
      if (b.dataset.reset != null) { if (!confirm('어드민에서 고친 내용을 지우고 처음(제작 당시) 값으로 되돌릴까요?')) return; try { const r = await api('POST', `/api/admin/content/${key}`, { reset: true }); list = r.value.map(it => S.load ? S.load(clone(it)) : clone(it)); d.changed = false; saved(r, S.title); draw(); } catch (err) { fail(err); } }
    });
  }

  // ── 요금 관리(리프트·렌탈·강습)
  const nin = (v, attrs) => `<input class="in num" inputmode="numeric" value="${+v || 0}" ${attrs}>`;
  async function prices() {
    const tab = qs().get('t') || 'rental';
    const v = shell('요금 관리', { desc: '요금표 페이지·메인 요금 카드·예약 안내·검색엔진 구조화 데이터(가격)가 같이 바뀝니다. 0원은 홈페이지에 「문의」로 보입니다.', content: true,
      tool: `<div class="seg">${[['rental', '렌탈 요금'], ['lift', '리프트 요금'], ['lesson', '강습 요금']].map(([k, n]) => `<a href="#/prices?t=${k}" class="${tab === k ? 'on' : ''}">${n}</a>`).join('')}</div>` });
    const d = await api('GET', `/api/admin/content/${tab}`); let val = clone(d.value);
    const draw = () => {
      let body = '';
      if (tab === 'rental') body = val.map((g, gi) => `<section class="card"><div class="card-h"><h2>${h(g.group)}</h2><button class="btn sm" data-addrow="${gi}">${ico('plus')}품목 추가</button></div><div class="ptbl-wrap"><table class="ptbl"><thead><tr><th>품목 · 설명</th>${g.flat ? ['1타임', '2타임', '3타임'].map(t => `<th>${t}</th>`).join('') : ['1타임', '2타임', '3타임'].map(t => `<th colspan="2">${t} 정상가 / 예약가</th>`).join('')}<th></th></tr></thead><tbody>
          ${g.items.map((it, ii) => `<tr data-g="${gi}" data-r="${ii}"><td style="min-width:220px"><input class="in" data-k="name" value="${h(it.name)}" placeholder="품목 이름"><input class="in" data-k="sub" value="${h(it.sub || '')}" placeholder="설명(선택)" style="margin-top:6px;font-size:13px;height:36px"></td>
            ${g.flat ? it.p.map((x, j) => `<td>${nin(x, `data-p="${j}"`)}</td>`).join('') : it.p.map((pp, j) => `<td>${nin(pp[0], `data-p="${j}" data-q="0"`)}</td><td>${nin(pp[1], `data-p="${j}" data-q="1"`)}</td>`).join('')}
            <td style="white-space:nowrap"><button class="btn xs ghost" data-rmrow title="삭제">${ico('trash')}</button></td></tr>`).join('')}</tbody></table></div></section>`).join('');
      if (tab === 'lift') body = val.map((r, ri) => `<section class="card"><div class="card-h"><h2>${h(r.resort)}</h2></div>
          <div class="form-stack" style="margin-bottom:14px"><label class="fld"><span>표 제목</span><input class="in" data-top="${ri}" data-k="title" value="${h(r.title)}"></label><label class="fld"><span>안내 문구</span><textarea class="in" data-top="${ri}" data-k="note">${h(r.note)}</textarea></label></div>
          <div class="ptbl-wrap"><table class="ptbl"><thead><tr><th>구분</th><th>시간 안내(줄마다)</th>${r.seasons.map((s, si) => `<th colspan="2"><input class="in" data-season="${ri}:${si}" value="${h(s)}" style="height:32px;font-size:12.5px;text-align:center"><small>대인 정상 / 할인</small></th><th colspan="2"><small>소인 정상 / 할인</small></th>`).join('')}</tr></thead><tbody>
          ${r.rows.map((row, k) => `<tr data-lr="${ri}:${k}"><td><b>${h(row.time)}</b></td><td style="min-width:180px"><textarea class="in" data-detail style="min-height:80px;font-size:13px">${h(row.detail.join('\n'))}</textarea></td>
            ${row.adult.map((a, si) => `<td>${nin(a[0], `data-age="adult" data-s="${si}" data-q="0"`)}</td><td>${nin(a[1], `data-age="adult" data-s="${si}" data-q="1"`)}</td><td>${nin(row.child[si][0], `data-age="child" data-s="${si}" data-q="0"`)}</td><td>${nin(row.child[si][1], `data-age="child" data-s="${si}" data-q="1"`)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('');
      if (tab === 'lesson') body = `<section class="card"><div class="card-h"><h2>강습 요금</h2><button class="btn sm" data-addles>${ico('plus')}줄 추가</button></div>
          <label class="fld" style="margin-bottom:14px"><span>안내 문구</span><textarea class="in" data-lk="note">${h(val.note)}</textarea></label>
          <div class="ptbl-wrap"><table class="ptbl"><thead><tr><th>강습</th>${val.hours.map(x => `<th>${x}시간</th>`).join('')}<th></th></tr></thead><tbody>
          ${val.rows.map((r, i) => `<tr data-les="${i}"><td><input class="in" data-k="name" value="${h(r.name)}"></td>${r.p.map((x, j) => `<td>${nin(x, `data-p="${j}"`)}</td>`).join('')}<td><button class="btn xs ghost" data-rmles title="삭제">${ico('trash')}</button></td></tr>`).join('')}</tbody></table></div>
          <label class="fld" style="margin-top:14px"><span>강습 규칙 <small>줄마다 하나씩</small></span><textarea class="in" data-lk="rules">${h(val.rules.join('\n'))}</textarea></label></section>`;
      v.innerHTML = body + `<div class="savebar"><button class="btn pri" data-save>저장하고 홈페이지에 반영</button>${d.changed ? '<button class="btn ghost sm" data-reset>처음 값으로 되돌리기</button>' : ''}<span class="dirty" ${dirty ? '' : 'hidden'}>저장하지 않은 변경이 있습니다</span></div>
        <p class="help">FAQ 의 금액 문장(예: 「리프트권은 얼마나 할인되나요?」)은 자동으로 바뀌지 않습니다. 요금을 바꾸면 「자주 묻는 질문」의 답도 함께 고쳐 주세요.</p>`;
    };
    draw();
    const markDirty = () => { dirty = true; const x = $('.dirty', v); if (x) x.hidden = false; };
    const n = el => +String(el.value).replace(/\D/g, '') || 0;
    v.addEventListener('input', e => {
      const t = e.target;
      if (tab === 'rental') { const tr = t.closest('[data-g]'); if (!tr) return; const it = val[+tr.dataset.g].items[+tr.dataset.r];
        if (t.dataset.k) it[t.dataset.k] = t.value; else if (t.dataset.q != null) it.p[+t.dataset.p][+t.dataset.q] = n(t); else if (t.dataset.p != null) it.p[+t.dataset.p] = n(t); }
      if (tab === 'lift') {
        if (t.dataset.top != null) val[+t.dataset.top][t.dataset.k] = t.value;
        else if (t.dataset.season) { const [a, b] = t.dataset.season.split(':'); val[+a].seasons[+b] = t.value; }
        else { const tr = t.closest('[data-lr]'); if (!tr) return; const [a, k] = tr.dataset.lr.split(':').map(Number), row = val[a].rows[k];
          if (t.dataset.detail != null) row.detail = t.value.split('\n'); else row[t.dataset.age][+t.dataset.s][+t.dataset.q] = n(t); }
      }
      if (tab === 'lesson') { if (t.dataset.lk === 'note') val.note = t.value; else if (t.dataset.lk === 'rules') val.rules = t.value.split('\n');
        else { const tr = t.closest('[data-les]'); if (!tr) return; const r = val.rows[+tr.dataset.les]; if (t.dataset.k) r.name = t.value; else r.p[+t.dataset.p] = n(t); } }
      markDirty();
    });
    v.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.addrow != null) { const g = val[+b.dataset.addrow]; g.items.push({ name: '', p: g.flat ? [0, 0, 0] : [[0, 0], [0, 0], [0, 0]] }); markDirty(); draw(); return; }
      if (b.dataset.rmrow != null) { const tr = b.closest('[data-g]'); if (!confirm('이 품목을 지울까요?')) return; val[+tr.dataset.g].items.splice(+tr.dataset.r, 1); markDirty(); draw(); return; }
      if (b.dataset.addles != null) { val.rows.push({ name: '', p: val.hours.map(() => 0) }); markDirty(); draw(); return; }
      if (b.dataset.rmles != null) { val.rows.splice(+b.closest('[data-les]').dataset.les, 1); markDirty(); draw(); return; }
      if (b.dataset.save != null) { b.disabled = true; try { const r = await api('POST', `/api/admin/content/${tab}`, { value: val }); val = clone(r.value); d.changed = true; saved(r, '요금'); draw(); } catch (err) { fail(err); b.disabled = false; } return; }
      if (b.dataset.reset != null) { if (!confirm('어드민에서 고친 요금을 지우고 처음 값으로 되돌릴까요?')) return; try { const r = await api('POST', `/api/admin/content/${tab}`, { reset: true }); val = clone(r.value); d.changed = false; saved(r, '요금'); draw(); } catch (err) { fail(err); } }
    });
  }

  // ── 팝업
  async function popup() {
    const v = shell('팝업', { desc: '홈페이지 첫 화면에 띄우는 알림입니다. 기간이 지나면 자동으로 안 보이고, 손님은 「오늘 하루 보지 않기」로 닫을 수 있습니다.', content: true });
    const d = await api('GET', '/api/admin/content/popup'); const p = clone(d.value);
    const prev = () => `<div class="popprev">${p.img ? `<img src="${h(imgSrc(p.img))}" alt="">` : ''}${p.title || p.body ? `<div class="b">${p.title ? `<h3>${h(p.title)}</h3>` : ''}${p.body ? `<p>${h(p.body)}</p>` : ''}${p.link && p.linkText ? `<span class="btn pri sm">${h(p.linkText)}</span>` : ''}</div>` : ''}<div class="f"><span>오늘 하루 보지 않기</span><span>닫기</span></div></div>`;
    v.innerHTML = `<div class="cols"><section class="card"><div class="form-stack">
      <label class="toggle"><input type="checkbox" data-k="on"${p.on ? ' checked' : ''}>팝업 띄우기</label>
      <label class="fld"><span>제목</span><input class="in" data-k="title" value="${h(p.title)}" maxlength="40" placeholder="예: 25/26 시즌 사전 예약 오픈"></label>
      <label class="fld"><span>내용</span><textarea class="in" data-k="body" maxlength="300" placeholder="예: 리프트권 사전 예약 시 최대 50% 할인">${h(p.body)}</textarea></label>
      <div class="fld"><span>사진 <small>선택</small></span><div style="display:flex;gap:8px"><button class="btn sm" data-pic>${ico('cam')}${p.img ? '사진 바꾸기' : '사진 올리기'}</button>${p.img ? '<button class="btn sm ghost danger" data-nopic>사진 빼기</button>' : ''}</div></div>
      <div class="grid2"><label class="fld"><span>버튼 연결 주소 <small>선택</small></span><input class="in" data-k="link" value="${h(p.link)}" placeholder="/reserve/ 또는 https://…"></label><label class="fld"><span>버튼 글자</span><input class="in" data-k="linkText" value="${h(p.linkText)}" placeholder="예약하기"></label></div>
      <div class="grid2"><label class="fld"><span>시작일 <small>비우면 바로</small></span><input class="in" type="date" data-k="from" value="${h(p.from)}"></label><label class="fld"><span>종료일 <small>비우면 계속</small></span><input class="in" type="date" data-k="to" value="${h(p.to)}"></label></div></div></section>
      <section class="card"><h2>미리보기</h2><p class="h-sub">홈페이지에서는 왼쪽 위(휴대폰은 아래쪽)에 뜹니다.</p><div id="pv">${prev()}</div></section></div>
      <div class="savebar"><button class="btn pri" data-save>저장하고 홈페이지에 반영</button><span class="dirty" hidden>저장하지 않은 변경이 있습니다</span></div>`;
    const md = () => { dirty = true; $('.dirty', v).hidden = false; $('#pv').innerHTML = prev(); };
    v.addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; p[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; md(); });
    v.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pic != null) { const f = await pickFile(); if (!f) return; try { p.img = await prepImage(f, 900); md(); b.textContent = '사진 바꾸기'; } catch (err) { fail(err); } }
      if (b.dataset.nopic != null) { p.img = ''; md(); b.remove(); }
      if (b.dataset.save != null) { b.disabled = true; try { const up = typeof p.img === 'object' ? p.img.data : null; const r = await api('POST', '/api/admin/content/popup', { value: p }); if (up && r.value.img) previews[r.value.img] = up; Object.assign(p, r.value); saved(r, '팝업'); $('.dirty', v).hidden = true; } catch (err) { fail(err); } b.disabled = false; }
    });
  }

  // ── 기본정보 / 추적 코드(한 화면 형식)
  async function simpleForm(key, title, desc, fields) {
    const v = shell(title, { desc, content: true });
    const d = await api('GET', `/api/admin/content/${key}`); const val = clone(d.value);
    v.innerHTML = `<section class="card"><div class="form-stack">${fields.map(([k, label, ph, hint]) => `<label class="fld"><span>${h(label)}${hint ? `<small>${h(hint)}</small>` : ''}</span><input class="in" data-k="${k}" value="${h(val[k] || '')}" placeholder="${h(ph || '')}"></label>`).join('')}</div></section>
      <div class="savebar"><button class="btn pri" data-save>저장하고 홈페이지에 반영</button><span class="dirty" hidden>저장하지 않은 변경이 있습니다</span></div>`;
    v.addEventListener('input', e => { if (e.target.dataset.k) { val[e.target.dataset.k] = e.target.value.trim(); dirty = true; $('.dirty', v).hidden = false; } });
    $('[data-save]', v).onclick = async e => { const b = e.target; b.disabled = true; try { const r = await api('POST', `/api/admin/content/${key}`, { value: val }); saved(r, title); $('.dirty', v).hidden = true; } catch (err) { fail(err); } b.disabled = false; };
  }

  // ── 접속 통계
  const PAGE_NAMES = { '/': '메인', '/about/': '소개', '/location/': '오시는 길', '/notice/': '공지사항', '/faq/': '자주 묻는 질문', '/gallery/': '갤러리', '/secondhand/': '중고장터', '/rates/lift/': '리프트 요금', '/rates/rental/': '렌탈 요금', '/stay/tower/': '타워 콘도', '/stay/villa/': '빌라 콘도', '/stay/greenpia/': '그린피아 콘도', '/lesson/': '강습 요금', '/lesson/program/': '강습 프로그램', '/lesson/instructors/': '강사진', '/reserve/': '예약하기', '/quote/': '견적문의', '/privacy/': '개인정보처리방침' };
  const EV_NAMES = { call_click: '전화 버튼', sms_click: '문자 버튼', map_click: '지도 열기', quick_open: '바로 문의 열기' };
  async function stats() {
    const days = +qs().get('d') || 30;
    const v = shell('접속 통계', { desc: '홈페이지 자체 집계입니다(쿠키·개인정보 없이 숫자만). 방문자는 하루 단위로 같은 사람을 한 번만 셉니다.', tool: `<div class="seg">${[7, 30, 90].map(n => `<a href="#/stats?d=${n}" class="${days === n ? 'on' : ''}">${n}일</a>`).join('')}</div>` });
    const s = await api('GET', `/api/admin/stats?days=${days}`), t = s.total;
    const search = Object.entries(t.sources).filter(([k]) => /검색|구글|Bing|다음/.test(k)).reduce((a, [, x]) => a + x, 0), ai = Object.values(t.ai).reduce((a, b) => a + b, 0);
    const leadsN = Object.values(t.leads).reduce((a, b) => a + b, 0);
    v.innerHTML = `${s.persistent ? '' : '<div class="box warn">통계 저장소(DATA_DIR)가 없어 서버를 다시 시작하면 숫자가 초기화됩니다.</div>'}
      <div class="kpis"><div class="kpi"><span>방문자</span><b>${num(t.uv)}명</b><small>하루 평균 ${num(Math.round(t.uv / days * 10) / 10)}명 · 페이지 ${num(t.pv)}회</small></div>
        <div class="kpi"><span>검색 유입</span><b>${num(search)}회</b><small>네이버·구글·다음 등</small></div>
        <div class="kpi"><span>AI 답변 유입</span><b>${num(ai)}회</b><small>ChatGPT·Perplexity·Gemini 등</small></div>
        <div class="kpi"><span>홈페이지 접수 · 전화</span><b>${num(leadsN)}건</b><small>전화 버튼 ${num(t.events.call_click || 0)}회</small></div></div>
      <section class="card"><div class="card-h"><h2>날짜별 방문자</h2></div>${bars(s.days.map(x => ({ label: md(x.date), v: x.uv, v2: x.leads })), { two: true, h: 190 })}<p class="legend"><span><i style="background:#1E2A44"></i>방문자</span><span><i style="background:#E3262B"></i>접수</span></p></section>
      <div class="cols"><section class="card"><h2>유입 경로</h2><p class="h-sub">어디를 보고 들어왔는지</p>${rank(t.sources)}</section>
        <section class="card"><h2>네이버 검색어</h2><p class="h-sub">네이버 검색으로 들어온 검색어</p>${rank(t.search, 'red')}</section>
        <section class="card"><h2>AI 답변</h2><p class="h-sub">AI 답변 속 링크로 들어온 방문</p>${rank(t.ai, 'ai')}</section>
        <section class="card"><h2>많이 본 페이지</h2>${rank(t.pages, '', 10, k => PAGE_NAMES[k] || k)}</section>
        <section class="card"><h2>클릭</h2>${rank(t.events, 'red', 8, k => EV_NAMES[k] || k)}<h2 style="margin-top:18px">기기</h2>${rank(t.devices)}</section>
        <section class="card"><h2>검색·AI 로봇 방문</h2><p class="h-sub">검색엔진·AI 가 홈페이지를 읽어 간 횟수(사람 방문에는 안 셈)</p>${rank(t.bots, 'ai')}</section>
        <section class="card"><h2>다른 사이트</h2>${rank(t.refs)}</section></div>`;
  }

  // ── 블로그
  async function blog() {
    const v = shell('블로그', { desc: '매일 09·13·18시에 1편씩 자동으로 발행됩니다(메인 키워드 대기열 순서). 공개 시각이 지난 글만 홈페이지에 보입니다.', tool: `<a class="btn sm" href="${BASE}blog/" target="_blank" rel="noopener">블로그 보기</a>` });
    const d = await api('GET', '/api/admin/blog');
    const live = d.posts.filter(p => p.live), wait = d.posts.filter(p => !p.live).reverse();
    v.innerHTML = `<div class="kpis"><div class="kpi"><span>공개된 글</span><b>${num(live.length)}편</b></div><div class="kpi"><span>예약된 글</span><b>${num(wait.length)}편</b><small>${wait[0] ? h(wait[0].date + ' ' + wait[0].time) + ' 공개 예정' : '없음'}</small></div><div class="kpi"><span>남은 주제</span><b>${num(d.todo.length)}개</b><small>다 쓰면 키워드×관점 조합으로 자동</small></div><div class="kpi"><span>검증 실패 초안</span><b>${num(d.drafts.length)}편</b><small>관리자가 확인</small></div></div>
      <div class="cols"><section class="card"><h2>글 목록</h2><p class="h-sub">최근 순</p>${d.posts.length ? `<ul class="recent">${d.posts.slice(0, 40).map(p => `<li style="cursor:default"><span class="pill ${p.live ? 'st-done' : 'st-contacted'}">${p.live ? '공개' : '예약'}</span><span>${p.live ? `<a href="${BASE}blog/${h(p.slug)}/" target="_blank" rel="noopener">${h(p.title)}</a>` : h(p.title)}<br><small class="muted">${h(p.keyword)} · ${num(p.chars)}자</small></span><span class="meta">${h(p.date.slice(5))} ${h(p.time)}</span></li>`).join('')}</ul>` : '<p class="help">아직 글이 없습니다.</p>'}</section>
      <section class="card"><h2>다음에 쓸 주제</h2><p class="h-sub">위에서부터 하나씩 씁니다</p><ul class="recent">${d.todo.slice(0, 12).map((t, i) => `<li style="cursor:default"><span class="tp">${i + 1}</span><span>${h(t.title)}<br><small class="muted">${h((t.keywords || []).join(', '))}</small></span></li>`).join('') || '<li>대기열이 비었습니다(자동 조합 주제로 이어 씁니다)</li>'}</ul>
      ${ME.user.role === 'owner' ? `<form id="tf" class="form-stack" style="margin-top:16px;border-top:1px solid var(--line2);padding-top:16px"><b>주제 추가(다음 순서로)</b><label class="fld"><span>주제</span><input class="in" name="title" placeholder="예: 용평 스키장 주차와 장비 수령 동선"></label><label class="fld"><span>검색어 <small>쉼표로, 첫 번째가 1순위</small></span><input class="in" name="keywords" placeholder="용평 스키장 주차, 용평 렌탈 위치"></label><label class="fld"><span>분류</span><select class="in" name="category">${['렌탈 가이드', '리프트권·요금', '스키 강습', '스키장 이용 팁', '숙박·여행'].map(c => `<option>${c}</option>`).join('')}</select></label><button class="btn dark">추가</button></form>` : ''}</section></div>`;
    const tf = $('#tf'); if (tf) tf.onsubmit = async e => { e.preventDefault(); try { const r = await api('POST', '/api/admin/blog/topics', { title: tf.title.value, keywords: tf.keywords.value, category: tf.category.value }); saved(r, '블로그 주제'); } catch (err) { fail(err); } };
  }

  // ── 관리자 전용: 작업 기록 · 계정
  async function log() {
    const v = shell('작업 기록', { desc: '어드민에서 저장한 내용(사이트 반영)과 접수 처리·로그인 기록입니다.' });
    const d = await api('GET', '/api/admin/log');
    v.innerHTML = `<div class="cols"><section class="card"><h2>사이트 내용 저장</h2><p class="h-sub">저장소 커밋 기록</p>${d.commits.length ? `<ul class="recent">${d.commits.map(c => `<li style="cursor:default"><span>${h(c.message.split('\n')[0].replace(/^어드민: /, ''))}</span><span class="meta">${h(c.author)} · ${h(String(c.date).slice(0, 16).replace('T', ' '))}</span></li>`).join('')}</ul>` : '<p class="help">기록 없음</p>'}</section>
      <section class="card"><h2>처리 기록</h2><p class="h-sub">접수 상태·삭제·내려받기·로그인</p>${d.audit.length ? `<ul class="recent">${d.audit.map(a => `<li style="cursor:default"><span>${h(a.action)} ${h(a.target || '')}</span><span class="meta">${h(a.user)} · ${h(a.at.slice(5, 16))}</span></li>`).join('')}</ul>` : '<p class="help">기록 없음</p>'}</section></div>`;
  }
  async function users() {
    const v = shell('계정 관리', { desc: '관리자(세느루)와 업체 담당자 계정입니다. 업체 계정은 추적 코드·작업 기록·계정 관리가 보이지 않습니다.' });
    const d = await api('GET', '/api/admin/users');
    v.innerHTML = `${d.canWrite ? '' : '<div class="box warn">서버 볼륨(DATA_DIR)이 없어 계정을 바꿀 수 없습니다(읽기 전용).</div>'}
      <section class="card"><table class="tbl" style="display:table"><thead><tr><th>아이디</th><th>이름</th><th>권한</th><th>만든 날</th><th></th></tr></thead><tbody>
      ${d.users.map(u => `<tr><td class="nm">${h(u.id)}</td><td>${h(u.name)}</td><td><span class="tp ${u.role === 'owner' ? 'tp-quote' : ''}">${h(u.roleName)}</span></td><td class="dt">${h(u.created || '')}</td><td style="text-align:right;white-space:nowrap"><button class="btn xs" data-reset="${h(u.id)}" ${d.canWrite ? '' : 'disabled'}>비밀번호 초기화</button> ${u.id !== ME.user.id ? `<button class="btn xs danger" data-del="${h(u.id)}" ${d.canWrite ? '' : 'disabled'}>삭제</button>` : ''}</td></tr>`).join('')}</tbody></table></section>
      <section class="card"><h2>계정 추가</h2><form class="grid3" id="uf" style="margin-top:12px;align-items:end"><label class="fld"><span>아이디</span><input class="in" name="id" placeholder="영문 소문자·숫자" autocapitalize="off"></label><label class="fld"><span>이름</span><input class="in" name="name" placeholder="예: 매장 직원"></label><label class="fld"><span>권한</span><select class="in" name="role"><option value="client">업체 담당자</option><option value="owner">관리자</option></select></label><button class="btn dark" ${d.canWrite ? '' : 'disabled'}>만들기</button></form><div id="pwout"></div></section>`;
    const showPw = (id, pw) => { $('#pwout').innerHTML = `<div class="box ok" style="margin-top:14px"><b>${h(id)}</b> 첫 비밀번호: <span class="pwd">${h(pw)}</span><br>지금 한 번만 보입니다. 직접 전달하고, 첫 로그인 뒤 「내 계정」에서 바꾸게 하세요.</div>`; };
    $('#uf').onsubmit = async e => { e.preventDefault(); const f = e.target; try { const r = await api('POST', '/api/admin/users', { action: 'create', id: f.id.value.trim(), name: f.name.value.trim(), role: f.role.value }); await users(); showPw(f.id.value.trim(), r.password); } catch (err) { fail(err); } };
    v.addEventListener('click', async e => {
      const r = e.target.closest('[data-reset]'), dl = e.target.closest('[data-del]');
      if (r) { if (!confirm(`${r.dataset.reset} 의 비밀번호를 새로 만들까요? 지금 로그인된 곳은 끊깁니다.`)) return; try { const x = await api('POST', '/api/admin/users', { action: 'reset', id: r.dataset.reset }); showPw(r.dataset.reset, x.password); } catch (err) { fail(err); } }
      if (dl) { if (!confirm(`${dl.dataset.del} 계정을 지울까요?`)) return; try { await api('POST', '/api/admin/users', { action: 'delete', id: dl.dataset.del }); users(); } catch (err) { fail(err); } }
    });
  }
  function me() {
    const v = shell('내 계정', { desc: `${h(ME.user.name)} · ${h(ME.user.roleName)} · 아이디 ${h(ME.user.id)}` });
    v.innerHTML = `<section class="card" style="max-width:520px"><h2>비밀번호 바꾸기</h2><p class="h-sub">10자 이상, 영문과 숫자를 섞어 주세요. 바꾸면 다른 기기의 로그인은 끊깁니다.</p>
      <form class="form-stack" id="pf"><label class="fld"><span>지금 비밀번호</span><input class="in" type="password" name="current" autocomplete="current-password" required></label>
      <label class="fld"><span>새 비밀번호</span><input class="in" type="password" name="next" autocomplete="new-password" required minlength="10"></label>
      <label class="fld"><span>새 비밀번호 확인</span><input class="in" type="password" name="next2" autocomplete="new-password" required></label><button class="btn dark">바꾸기</button></form></section>`;
    $('#pf').onsubmit = async e => { e.preventDefault(); const f = e.target; if (f.next.value !== f.next2.value) return toast('새 비밀번호가 서로 다릅니다'); try { await api('POST', '/api/admin/me/password', { current: f.current.value, next: f.next.value }); toast('비밀번호를 바꿨습니다. 다시 로그인해 주세요.'); ME.user = null; setTimeout(render, 1200); } catch (err) { fail(err); } };
  }

  // ── 라우터
  async function render() {
    if (!ME.user) return loginView();
    const r = route()[0].split('?')[0];
    const own = ['tags', 'log', 'users', 'blog'];
    if (own.includes(r) && ME.user.role !== 'owner') { location.hash = '#/'; return; }
    const views = {
      '': dashboard, leads, stats, prices, popup, me, log, users, blog,
      notices: () => listEditor('notices'), gallery: () => listEditor('gallery'), used: () => listEditor('used'), faq: () => listEditor('faq'), instructors: () => listEditor('instructors'),
      site: () => simpleForm('site', '기본정보', '홈페이지 전체(머리말·바닥글·전화 버튼·예약 안내·구조화 데이터)에 들어가는 연락처입니다.', [['phone', '대표전화', '033-336-9884'], ['sms', '문자 받을 휴대폰', '010-0000-0000', '접수 서버가 안 될 때 손님이 문자로 보내는 번호'], ['hours', '영업시간', '시즌 중 매일 08:00~23:00']]),
      tags: () => simpleForm('tags', '추적 코드', '검색엔진 소유확인·방문 분석 코드입니다. 운영 도메인 연결 뒤 넣으세요(미리보기 주소에는 분석 태그가 들어가지 않습니다).', [['ga4', 'GA4 측정 ID', 'G-XXXXXXXXXX'], ['naverWa', '네이버 애널리틱스 ID', ''], ['naverVerify', '네이버 서치어드바이저 소유확인', 'naver-site-verification 값'], ['googleVerify', '구글 서치콘솔 소유확인', 'google-site-verification 값']]),
    };
    const fn = views[r] || dashboard;
    try { await fn(); } catch (e) { const v = $('#view'); if (v) v.innerHTML = `<div class="box bad">${h(e.message)}</div>`; else fail(e); }
  }
  let lastHash = location.hash;
  window.addEventListener('hashchange', () => {
    if (dirty && !confirm('저장하지 않은 내용이 있습니다. 나가시겠어요?')) { history.replaceState(null, '', lastHash); return; }
    dirty = false; lastHash = location.hash; document.querySelectorAll('.drawer').forEach(d => d.remove()); render();
  });
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  (async () => {
    try { ME = await api('GET', '/api/admin/me'); } catch { ME = { ready: false }; }
    render(); if (ME.user) startPoll();
  })();
})();
