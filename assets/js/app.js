/* 뽀드득 — 헤더·드로어·히어로 영상·탭·라이트박스(바텀시트)·슬라이더·토스트·스켈레톤·스크롤 등장·지도·3단계 접수 폼 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CFG = window.PPD || {};

  /* 토스트 */
  const toastEl = $('#toast'); let toastT;
  const toast = msg => { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2400); };
  const copy = async (text, msg = '복사했습니다') => {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast(msg); } catch { toast('복사하지 못했습니다'); } t.remove(); }
  };
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy, '주소를 복사했습니다')));

  /* 헤더: 맨 위에서는 투명, 내리면 흰 바탕 */
  const hd = $('#hd');
  const hasCover = !!$('.hero, .sub-hd');
  const onScroll = () => hd && hd.classList.toggle('is-solid', !hasCover || scrollY > 24);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  /* 드로어(전체 메뉴) */
  let lastFocus;
  // 열기·닫기는 프레임 타이밍에 기대지 않는다(강제 리플로 후 클래스) — 빠르게 열고 닫아도 순서가 꼬이지 않게 닫힘 타이머를 취소
  const openLayer = el => { clearTimeout(el._t); lastFocus = document.activeElement; el.hidden = false; void el.offsetWidth; el.classList.add('is-open'); document.documentElement.style.overflow = 'hidden'; const f = el.querySelector('button, a, [tabindex]'); f && setTimeout(() => f.focus(), 60); };
  const closeLayer = el => { el.classList.remove('is-open'); document.documentElement.style.overflow = ''; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 320); lastFocus && lastFocus.focus && lastFocus.focus(); };
  const drawer = $('#drawer-menu'), quick = $('#drawer-quick');
  $$('[data-drawer-open]').forEach(b => b.addEventListener('click', () => { const d = $('#drawer-' + b.dataset.drawerOpen); d && openLayer(d); }));
  $$('.drawer').forEach(d => $$('[data-drawer-close]', d).forEach(b => b.addEventListener('click', () => closeLayer(d))));
  drawer && $$('a', drawer).forEach(a => a.addEventListener('click', () => closeLayer(drawer)));

  /* 스켈레톤: 사진이 다 받아지면 반짝임을 끈다 */
  $$('.ph img').forEach(img => { const done = () => img.closest('.ph').classList.add('is-loaded'); img.complete && img.naturalWidth ? done() : (img.addEventListener('load', done), img.addEventListener('error', done)); });

  /* 화면에 들어오면 실행 — IntersectionObserver + 스크롤 위치 점검(일부 인앱 브라우저는 IO 콜백이 오지 않아 내용이 안 보일 수 있음) */
  const watchers = [];
  const inView = (el, margin = 0) => { const r = el.getBoundingClientRect(); return r.top < innerHeight + margin && r.bottom > -margin && (r.width || r.height); };
  const onEnter = (el, fn, margin = 0) => {
    let done = false; const run = () => { if (done) return; done = true; fn(); };
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); run(); } }, { rootMargin: `${margin}px 0px ${margin ? margin : -40}px 0px` }); io.observe(el); }
    watchers.push(() => { if (!done && inView(el, margin)) run(); return done; });
  };
  let lastCheck = 0;
  const check = () => { const now = Date.now(); if (now - lastCheck < 120) return; lastCheck = now; for (let i = watchers.length - 1; i >= 0; i--) if (watchers[i]()) watchers.splice(i, 1); };
  addEventListener('scroll', check, { passive: true }); addEventListener('resize', check); addEventListener('load', () => setTimeout(check, 300));
  if (reduce) $$('.reveal').forEach(el => el.classList.add('is-in'));
  else $$('.reveal').forEach(el => onEnter(el, () => el.classList.add('is-in')));
  setTimeout(check, 600);

  /* 히어로 영상: 화면 크기별 파일, 끝부분(로고 엔드카드)에서는 문구를 감춘다 */
  const hero = $('[data-hero]');
  if (hero) {
    const v = $('.hero-v', hero);
    const mobile = matchMedia('(max-width: 760px)').matches;
    const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
    if (mobile) v.poster = v.dataset.posterM;
    // PC는 원본 최고 화질(1920), 회선이 느리다고 알려 온 경우만 1280. 휴대폰은 원본 화소 세로 영상
    const slow = navigator.connection && /(^|-)3g|2g/.test(navigator.connection.effectiveType || '');
    const src = mobile ? v.dataset.srcM : (slow ? v.dataset.src : v.dataset.srcXl);
    const soundBtn = $('[data-hero-sound]', hero), replayBtn = $('[data-hero-replay]', hero);
    const icons = { on: soundBtn.innerHTML, off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4M14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6"/></svg>' };
    const start = () => { if (!v.src) { v.src = src; } const p = v.play(); p && p.catch(() => {}); };
    if (!reduce && !saveData) {
      // 첫 화면 그림이 먼저 뜨게, 페이지 로드가 끝난 뒤 영상을 받는다
      if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
    }
    // 끝 4.4초(흰 화면 + 로고): 문구를 감추고, 흰 바탕 위에서 메뉴 글자가 보이게 헤더를 어두운 글자로
    v.addEventListener('timeupdate', () => { if (!v.duration) return; const end = v.currentTime > v.duration - 4.4; hero.classList.toggle('is-end', end); hd && hd.classList.toggle('on-light', end); });
    soundBtn.addEventListener('click', () => {
      if (!v.src) start();
      v.muted = !v.muted; soundBtn.setAttribute('aria-pressed', String(!v.muted)); soundBtn.setAttribute('aria-label', v.muted ? '소리 켜기' : '소리 끄기');
      soundBtn.innerHTML = v.muted ? icons.on : icons.off; if (!v.muted) v.play(); toast(v.muted ? '소리를 껐습니다' : '소리를 켰습니다');
    });
    replayBtn.addEventListener('click', () => { if (!v.src) start(); v.currentTime = 0; v.play(); hero.classList.remove('is-end'); });
    // 무한 반복: loop 속성 + 끝나면 처음으로(일부 브라우저 대비) + 탭으로 돌아오면 다시 재생
    v.addEventListener('ended', () => { v.currentTime = 0; v.play().catch(() => {}); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && v.src && v.paused) v.play().catch(() => {}); });
  }

  /* 탭: 같은 부모 안의 .tab-pane 을 바꾸거나, data-filter-grid 사진을 거른다 */
  $$('[data-tabs]').forEach(bar => {
    const id = bar.dataset.tabs, tabs = $$('[role=tab]', bar);
    const grid = $(`[data-filter-grid="${id}"]`);
    const panes = grid ? [] : $$(':scope > .tab-pane', bar.parentElement);
    const select = (i, focus) => {
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      if (grid) {
        const key = tabs[i].dataset.tab; let n = 0;
        $$('.gi', grid).forEach(g => { const show = key === 'all' || g.dataset.cat === key; g.hidden = !show; if (show) { n++; g.classList.add('is-in'); } });
        const empty = $('.gal-empty', grid); if (empty) empty.hidden = n > 0;
      } else panes.forEach((p, k) => { p.hidden = k !== i; });
      focus && tabs[i].focus();
      tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    tabs.forEach((t, i) => { t.addEventListener('click', () => select(i)); t.addEventListener('keydown', e => { if (e.key === 'ArrowRight') select((i + 1) % tabs.length, true); if (e.key === 'ArrowLeft') select((i - 1 + tabs.length) % tabs.length, true); }); });
    if (grid && location.hash) { const want = decodeURIComponent(location.hash.slice(1)); const k = tabs.findIndex(t => t.dataset.tab === want); if (k > -1) select(k); }
    addEventListener('hashchange', () => { if (!grid) return; const k = tabs.findIndex(t => t.dataset.tab === decodeURIComponent(location.hash.slice(1))); if (k > -1) select(k); });
  });

  /* 라이트박스(휴대폰은 아래에서 올라오는 시트) */
  const modal = $('#lightbox');
  if (modal) {
    const im = $('.lb-img img', modal), cap = $('figcaption', modal), box = $('.lb-img', modal);
    let list = [], idx = 0;
    const show = i => { idx = (i + list.length) % list.length; const b = list[idx]; box.classList.remove('is-loaded'); im.onload = () => box.classList.add('is-loaded'); im.src = b.dataset.lb; im.alt = b.dataset.lbCap || ''; cap.textContent = `${b.dataset.lbCap || ''}${list.length > 1 ? `  (${idx + 1}/${list.length})` : ''}`; $$('.lb-nav', modal).forEach(n => { n.hidden = list.length < 2; }); };
    document.addEventListener('click', e => { const b = e.target.closest('[data-lb]'); if (!b) return; e.preventDefault(); list = $$(`[data-lb-group="${b.dataset.lbGroup}"]`).filter(x => !x.closest('[hidden]')); show(list.indexOf(b)); openLayer(modal); });
    $$('[data-modal-close]', modal).forEach(b => b.addEventListener('click', () => closeLayer(modal)));
    $('.lb-prev', modal).addEventListener('click', () => show(idx - 1)); $('.lb-next', modal).addEventListener('click', () => show(idx + 1));
    let sx = 0; box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); });
    document.addEventListener('keydown', e => { if (modal.hidden) return; if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); });
  }
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; [modal, drawer, quick].forEach(l => l && !l.hidden && closeLayer(l)); });

  /* 요금 카드 링크(#gear·#wear·#safety): PC 표 행 또는 휴대폰 제목 중 보이는 쪽으로 이동 */
  const jump = () => { const k = decodeURIComponent(location.hash.slice(1)); if (!k) return; const t = $$(`[data-anchor="${k}"]`).find(e => e.offsetParent); if (t) setTimeout(() => window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 140, behavior: 'auto' }), 60); };
  addEventListener('load', jump); addEventListener('hashchange', jump);

  /* 객실 사진 슬라이더 */
  $$('[data-slider]').forEach(sl => {
    const track = $('.slides', sl), cnt = $('.sl-count span', sl);
    const step = d => track.scrollBy({ left: d * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    $('.sl-prev', sl).addEventListener('click', () => step(-1)); $('.sl-next', sl).addEventListener('click', () => step(1));
    track.addEventListener('scroll', () => { cnt.textContent = Math.round(track.scrollLeft / track.clientWidth) + 1; }, { passive: true });
  });

  /* 카카오 지도(기존 사이트 '지도 퍼가기'): 화면에 보일 때만 불러온다. 로더가 document.write 를 써서 잠시 가로채 스크립트로 바꿔 넣는다 */
  const map = $('[data-roughmap]');
  if (map) {
    onEnter(map, () => {
      const render = () => { try { new window.daum.roughmap.Lander({ timestamp: map.dataset.roughmap, key: map.dataset.roughmapKey, mapWidth: String(Math.round(map.clientWidth)), mapHeight: map.dataset.mapH || '420' }).render(); map.classList.add('is-loaded'); } catch { $('.map-ph span', map).textContent = '지도를 불러오지 못했습니다. 아래 지도 버튼을 이용해 주세요.'; } };
      const dw = document.write.bind(document);
      document.write = html => { const m = /src="([^"]+)"/.exec(html); if (!m) return dw(html); const s = document.createElement('script'); s.src = m[1]; s.charset = 'UTF-8'; s.onload = () => { document.write = dw; render(); }; document.head.appendChild(s); };
      const l = document.createElement('script'); l.src = 'https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js'; l.charset = 'UTF-8'; l.onerror = () => { document.write = dw; $('.map-ph span', map).textContent = '지도를 불러오지 못했습니다.'; }; document.head.appendChild(l);
    }, 200);
  }

  /* 바로 문의·접수(오른쪽 떠 있는 버튼 / 모바일 하단 바) */
  const qf = $('form[data-quick]');
  if (qf) {
    const qd = $('.quick-done', quick), qtel = qf.elements.phone;
    qtel.addEventListener('input', () => { const d = qtel.value.replace(/\D/g, '').slice(0, 11); qtel.value = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`; });
    qf.elements.date.min = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    qf.addEventListener('input', e => e.target.classList && e.target.classList.remove('is-invalid'));
    const show = (text, sent) => {
      qf.hidden = true; qd.hidden = false; $('[data-summary]', qd).textContent = text;
      $('[data-done-title]', qd).textContent = sent ? '문의가 접수되었습니다' : '접수 내용을 확인해 주세요';
      $('[data-done-lead]', qd).textContent = sent ? '확인 후 남겨 주신 연락처로 바로 연락드립니다.' : `아래 버튼으로 문자를 보내 주시면 확인 후 연락드립니다. 문자가 어려우면 ${CFG.phone}로 전화 주세요.`;
      const sms = $('[data-sms]', qd); sms.hidden = sent || !CFG.sms;
      sms.href = `sms:${(CFG.sms || '').replace(/-/g, '')}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(text)}`;
      qd.focus();
    };
    $('[data-copy-summary]', qd).addEventListener('click', () => copy($('[data-summary]', qd).textContent, '접수 내용을 복사했습니다'));
    $('[data-quick-reset]', qd).addEventListener('click', () => { qf.reset(); qf.hidden = false; qd.hidden = true; qf.elements.name.focus(); });
    qf.addEventListener('submit', async e => {
      e.preventDefault();
      if (qf.elements.company.value) return;
      if (!qf.elements.name.value.trim()) { qf.elements.name.classList.add('is-invalid'); return toast('이름을 입력해 주세요'); }
      if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(qtel.value)) { qtel.classList.add('is-invalid'); return toast('연락처를 확인해 주세요'); }
      if (!qf.elements.agree.checked) return toast('개인정보 수집 및 이용에 동의해 주세요');
      const topics = $$('[name=topic]:checked', qf).map(x => x.value);
      const L = ['[뽀드득 바로 문의]', `이름: ${qf.elements.name.value.trim()}`, `연락처: ${qtel.value}`];
      if (qf.elements.date.value) L.push(`이용날짜: ${qf.elements.date.value}`);
      L.push(`스키장: ${qf.elements.resort.value}`);
      if (topics.length) L.push(`문의 항목: ${topics.join(', ')}`);
      if (qf.elements.memo.value.trim()) L.push(`내용: ${qf.elements.memo.value.trim()}`);
      L.push(`보낸 페이지: ${document.title.split('|')[0].trim()}`);
      const text = L.join('\n');
      if (!CFG.endpoint) return show(text, false);
      const btn = qf.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = '접수 중…';
      try {
        const body = Object.fromEntries(new FormData(qf)); body.type = 'quick'; body.topic = topics; body.summary = text; body.page = location.href;
        const r = await fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(r.status);
        show(text, true);
      } catch { toast('접수 서버에 연결하지 못했습니다. 문자나 전화로 보내 주세요.'); show(text, false); }
      finally { btn.disabled = false; btn.textContent = '문의 접수하기'; }
    });
  }

  /* 3단계 견적·예약 접수 */
  $$('form[data-book]').forEach(form => {
    const type = form.dataset.book, label = type === 'quote' ? '견적문의' : '예약';
    const steps = $$('.bstep', form), dots = $$('.book-steps li', form), done = $('.bdone', form);
    const RES = CFG.resorts || {}; // src/data.mjs RESORTS 에서 옴(스키장별 타임·정설시간)
    let cur = 0;
    const date = form.elements.date;
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    date.min = today;
    const go = i => { steps.forEach((s, k) => s.classList.toggle('is-on', k === i)); dots.forEach((d, k) => { d.classList.toggle('is-on', k === i); d.classList.toggle('is-done', k < i); }); cur = i; form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); const f = steps[i].querySelector('input, select, textarea'); f && setTimeout(() => f.focus({ preventScroll: true }), 300); };
    // 스키장 → 정설시간 안내 + 타임 선택지
    const tbox = $('[data-time-opts]', form), ghint = $('[data-grooming]', form);
    form.addEventListener('change', e => {
      if (e.target.name === 'resort') {
        const r = RES[e.target.value];
        ghint.innerHTML = `<b>${r.name} 정설시간 ${r.g}</b> · 선택하신 스키장에 따라 시간대가 달라집니다.`; ghint.classList.add('warn');
        tbox.innerHTML = r.t.map(([n, opts]) => `<div class="tgrp"><b>${n}</b><div class="chips">${opts.map(([o, h]) => `<label class="chip"><input type="radio" name="time" value="${n} ${o} ${h}" required><span>${o} ${h}</span></label>`).join('')}</div></div>`).join('');
      }
      if (e.target.name === 'lesson') { const on = !!e.target.value; ['lessonPeople', 'lessonHours'].forEach(n => { form.elements[n].disabled = !on; if (!on) form.elements[n].value = ''; }); }
      e.target.classList && e.target.classList.remove('is-invalid');
    });
    // 전화번호 자동 하이픈
    const tel = form.elements.phone;
    tel.addEventListener('input', () => { const d = tel.value.replace(/\D/g, '').slice(0, 11); tel.value = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`; });
    const need = i => {
      const s = steps[i]; let ok = true, msg = '';
      if (i === 0) {
        if (!date.value) { ok = false; msg = '이용날짜를 선택해 주세요'; date.classList.add('is-invalid'); }
        else if (!form.querySelector('[name=resort]:checked')) { ok = false; msg = '스키장을 선택해 주세요'; }
        else if (!form.querySelector('[name=time]:checked')) { ok = false; msg = '이용타임을 선택해 주세요'; }
      }
      if (i === 1 && form.elements.lesson.value) {
        if (!form.elements.lessonPeople.value) { ok = false; msg = '강습 인원을 선택해 주세요'; form.elements.lessonPeople.classList.add('is-invalid'); }
        else if (!form.elements.lessonHours.value) { ok = false; msg = '강습 시간을 선택해 주세요'; form.elements.lessonHours.classList.add('is-invalid'); }
      }
      if (i === 2) {
        if (!form.elements.name.value.trim()) { ok = false; msg = '작성자명을 입력해 주세요'; form.elements.name.classList.add('is-invalid'); }
        else if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(tel.value)) { ok = false; msg = '전화번호를 확인해 주세요'; tel.classList.add('is-invalid'); }
        else if (!form.elements.agree.checked) { ok = false; msg = '개인정보 수집 및 이용에 동의해 주세요'; }
      }
      if (!ok) toast(msg);
      return ok;
    };
    $$('[data-next]', form).forEach(b => b.addEventListener('click', () => need(cur) && go(cur + 1)));
    $$('[data-prev]', form).forEach(b => b.addEventListener('click', () => go(cur - 1)));
    const vals = n => $$(`[name="${n}"]:checked`, form).map(x => x.value);
    const summary = () => {
      const r = RES[form.querySelector('[name=resort]:checked').value];
      const L = [`[뽀드득 ${label}]`, `이용날짜: ${date.value}`, `스키장: ${r.name}`, `이용타임: ${vals('time')[0]}`];
      if (form.elements.people.value) L.push(`이용 인원: ${form.elements.people.value}명`);
      const ski = vals('ski'), board = vals('board'), wear = vals('wear');
      if (ski.length) L.push(`스키장비: ${ski.join(', ')}`); if (board.length) L.push(`보드장비: ${board.join(', ')}`); if (wear.length) L.push(`의류: ${wear.join(', ')}`);
      if (form.elements.lesson.value) L.push(`강습: ${form.elements.lesson.value} ${form.elements.lessonPeople.value} ${form.elements.lessonHours.value}`);
      L.push(`이름: ${form.elements.name.value.trim()}`, `연락처: ${tel.value}`);
      if (form.elements.memo.value.trim()) L.push(`요청사항: ${form.elements.memo.value.trim()}`);
      return L.join('\n');
    };
    const finish = (text, sent) => {
      steps.forEach(s => s.classList.remove('is-on')); dots.forEach(d => { d.classList.remove('is-on'); d.classList.add('is-done'); });
      done.hidden = false; $('[data-summary]', done).textContent = text;
      $('[data-done-title]', done).textContent = sent ? `${label} 접수가 완료되었습니다` : '접수 내용을 확인해 주세요';
      $('[data-done-lead]', done).textContent = sent ? '확인 후 남겨 주신 연락처로 안내드립니다. 급한 문의는 전화 주세요.' : `아래 버튼으로 내용을 문자로 보내 주시면 확인 후 연락드립니다. 문자가 어려우면 ${CFG.phone}로 전화 주세요.`;
      const sms = $('[data-sms]', done); sms.hidden = sent || !CFG.sms;
      sms.href = `sms:${(CFG.sms || '').replace(/-/g, '')}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(text)}`;
      done.focus(); done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    };
    $('[data-copy-summary]', form).addEventListener('click', () => copy($('[data-summary]', form).textContent, '접수 내용을 복사했습니다'));
    $('[data-restart]', form).addEventListener('click', () => { form.reset(); tbox.innerHTML = '<p class="hint">스키장을 먼저 선택해 주세요.</p>'; ghint.textContent = '선택하신 스키장에 따라 시간대가 달라집니다.'; ghint.classList.remove('warn'); done.hidden = true; dots.forEach(d => d.classList.remove('is-done')); go(0); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!need(2)) return;
      if (form.elements.company.value) return; // 자동 등록 방지
      const text = summary();
      if (!CFG.endpoint) return finish(text, false);
      const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = '접수 중…';
      try {
        const body = Object.fromEntries(new FormData(form)); body.type = type; body.summary = text;
        ['ski', 'board', 'wear'].forEach(n => { body[n] = vals(n); });
        const r = await fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(r.status);
        finish(text, true);
      } catch { toast('접수 서버에 연결하지 못했습니다. 문자나 전화로 보내 주세요.'); finish(text, false); }
      finally { btn.disabled = false; btn.textContent = type === 'quote' ? '견적 요청하기' : '예약 접수하기'; }
    });
  });
})();
