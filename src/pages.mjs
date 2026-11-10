// 페이지 본문. 기존 홈페이지 메뉴·내용을 그대로 옮기고(미러링), 질문형 제목과 첫 문단 직답을 더했다.
import { SITE, ABOUT, BRANCHES, RESORTS, LIFT, RENTAL, RENTAL_COLS, RENTAL_ITEMS, LESSON_FEE, PROGRAM, STAY, GALLERY, GALLERY_CATS, USED, NOTICES, PRIVACY, FAQ } from './data.mjs';
import { esc, won, img, phImg, kdate } from './lib.mjs';
import { ICON } from './layout.mjs';

const man = n => (n % 10000 === 0 ? `${n / 10000}만원` : won(n));
const price = n => (n ? won(n) : '<span class="ask">문의</span>');
const pct = (a, b) => Math.round((1 - b / a) * 100);

// ── 공용 부품 ──
export function subHead(u, { eyebrow, title, lead, bg = 'scene/carve.webp', crumbs = [] }) {
  return `<section class="sub-hd">
  <div class="sub-bg">${img(u, 'assets/img/' + bg, '', { lazy: false, priority: true, sizes: '100vw' })}</div>
  <div class="wrap sub-hd-in">
    <nav class="crumb" aria-label="현재 위치"><a href="${u('')}">홈</a>${crumbs.map(([t, h]) => h ? `<a href="${u(h)}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`).join('')}</nav>
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <h1>${esc(title)}</h1>
    ${lead ? `<p class="sub-lead">${esc(lead)}</p>` : ''}
  </div>
</section>`;
}
const subTabs = (u, items, cur) => `<nav class="sub-tabs" aria-label="하위 메뉴"><div class="wrap">${items.map(([t, h]) => `<a href="${u(h)}"${h === cur ? ' aria-current="page" class="is-on"' : ''}>${esc(t)}</a>`).join('')}</div></nav>`;
const answer = (q, a) => `<div class="answer reveal"><h2 class="answer-q">${esc(q)}</h2><p>${a}</p></div>`;
export const faqList = (faqs, openFirst = true) => `<div class="faq">${faqs.map((f, i) => `<details class="acc"${openFirst && i === 0 ? ' open' : ''}><summary><span class="q">Q</span><h3>${esc(f.q)}</h3>${ICON.chev}</summary><div class="acc-body"><p>${esc(f.a)}</p></div></details>`).join('')}</div>`;
const ctaBand = u => `<section class="cta-band"><div class="wrap cta-in reveal">
  <div><h2>이용 날짜와 스키장만 알려 주세요</h2><p>리프트권·장비·의류·강습을 한 번에 견적 내 드립니다. 리프트권 할인은 이용 1일 전까지 예약이 필요합니다.</p></div>
  <div class="cta-btns"><a class="btn btn-red btn-lg" href="${u('reserve/')}">${ICON.cal}예약하기</a><a class="btn btn-ghost btn-lg" href="${u('quote/')}">${ICON.doc}견적문의</a><a class="btn btn-ghost btn-lg" href="${SITE.phoneHref}">${ICON.phone}${SITE.phone}</a></div>
</div></section>`;

// ── 요금표 ──
export function liftTable(l) {
  const two = l.seasons.length === 2;
  const head = two
    ? `<thead><tr><th scope="col" colspan="2" rowspan="2">구분</th>${l.seasons.map(s => `<th scope="colgroup" colspan="3">${esc(s)}</th>`).join('')}</tr><tr>${l.seasons.map(() => `<th scope="col"></th><th scope="col">${esc(l.resort)} 정상가</th><th scope="col" class="hl">뽀드득 예약 할인가</th>`).join('')}</tr></thead>`
    : `<thead><tr><th scope="col" colspan="3">구분</th><th scope="col">${esc(l.resort)} 정상가</th><th scope="col" class="hl">뽀드득 할인가${l.extra ? `<small>${esc(l.extra)}</small>` : ''}</th></tr></thead>`;
  const body = l.rows.map(r => {
    const cells = who => (two ? [0, 1] : [0]).map(si => `<th scope="row" class="who">${who === 'adult' ? '대인' : '소인'}</th><td>${won(r[who][si][0])}</td><td class="hl"><strong>${won(r[who][si][1])}</strong></td>`).join('');
    return `<tr><th scope="rowgroup" rowspan="2" class="t">${r.time}</th><td rowspan="2" class="det">${r.detail.map(esc).join('<br>')}</td>${cells('adult')}</tr><tr>${cells('child')}</tr>`;
  }).join('');
  return `<div class="tbl-wrap"><table class="tbl tbl-lift"><caption>${esc(l.title)} 요금표</caption>${head}<tbody>${body}</tbody></table></div>`;
}
// 휴대폰용 카드형 리프트 요금
export function liftCards(l) {
  return `<div class="pcards">${l.rows.map(r => `<div class="pcard"><div class="pcard-hd"><strong>${r.time}</strong><span>${r.detail.map(esc).join(' · ')}</span></div>
  ${['adult', 'child'].map(w => `<div class="pcard-row"><span class="who">${w === 'adult' ? '대인' : '소인'}</span><span class="was">${won(r[w][0][0])}</span><span class="now">${won(r[w][0][1])}</span><span class="off">-${pct(r[w][0][0], r[w][0][1])}%</span></div>`).join('')}</div>`).join('')}</div>`;
}
export function rentalTable() {
  const head = `<thead><tr><th scope="col" colspan="2" rowspan="2">구분</th>${RENTAL_COLS.map(c => `<th scope="colgroup" colspan="2">${esc(c)}</th>`).join('')}</tr><tr>${RENTAL_COLS.map(() => '<th scope="col">정상가</th><th scope="col" class="hl">예약 할인가</th>').join('')}</tr></thead>`;
  const body = RENTAL.map(g => g.items.map((it, i) => {
    const name = `<td class="nm"><strong>${esc(it.name)}</strong>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</td>`;
    const cells = g.flat ? it.p.map(p => `<td colspan="2" class="hl">${price(p)}</td>`).join('') : it.p.map(([a, b]) => `<td>${price(a)}</td><td class="hl">${b ? `<strong>${won(b)}</strong>` : price(0)}</td>`).join('');
    return `<tr${i === 0 ? ` data-anchor="${g.key}"` : ''}>${i === 0 ? `<th scope="rowgroup" rowspan="${g.items.length}" class="t">${g.group}</th>` : ''}${name}${cells}</tr>`;
  }).join('')).join('');
  return `<div class="tbl-wrap"><table class="tbl tbl-rental"><caption>25-26시즌 용평리조트 렌탈 요금표</caption>${head}<tbody>${body}</tbody></table></div>`;
}
export function rentalCards(key) {
  const g = RENTAL.find(x => x.key === key);
  return `<div class="pcards">${g.items.map(it => `<div class="pcard"><div class="pcard-hd"><strong>${esc(it.name)}</strong>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</div>
  ${RENTAL_COLS.map((c, i) => { const v = it.p[i]; if (g.flat) return `<div class="pcard-row"><span class="who">${esc(c)}</span><span class="now">${price(v)}</span></div>`; return `<div class="pcard-row"><span class="who">${esc(c)}</span>${v[0] ? `<span class="was">${won(v[0])}</span><span class="now">${won(v[1])}</span>` : `<span class="now">${price(0)}</span>`}</div>`; }).join('')}</div>`).join('')}</div>`;
}
export function lessonTable() {
  return `<div class="tbl-wrap"><table class="tbl tbl-lesson"><caption>강습 요금(스키·보드 동일)</caption><thead><tr><th scope="col">구분</th>${LESSON_FEE.hours.map(h => `<th scope="col">${h}시간</th>`).join('')}</tr></thead><tbody>${LESSON_FEE.rows.map(r => `<tr><th scope="row">${r.name}</th>${r.p.map(p => `<td><strong>${man(p)}</strong></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function programGroups(lv) {
  const groups = [];
  for (const r of lv.rows) { if (r.learn || !groups.length) groups.push({ steps: [], learn: r.learn, goal: r.goal }); groups[groups.length - 1].steps.push(r); }
  return groups;
}
export function programBlock(lv, i, open = false) {
  return `<details class="acc lv"${open ? ' open' : ''} id="${lv.id}"><summary><span class="lv-no">LESSON 0${i + 1}</span><h3>${esc(lv.name)}</h3><span class="lv-lead">${esc(lv.lead)}</span>${ICON.chev}</summary>
  <div class="acc-body">${programGroups(lv).map(g => `<div class="lv-g">
    <div class="lv-col"><h4>구분 · 실기능력</h4><ul class="steps">${g.steps.map(s => `<li><b>${esc(s.step)}</b>${esc(s.skill)}</li>`).join('')}</ul></div>
    <div class="lv-col"><h4>강습내용</h4><ul>${g.learn.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="lv-col"><h4>학습목표</h4><ul>${g.goal.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`).join('')}</div></details>`;
}
function galleryItems(u, items, group) {
  return items.map((g, i) => `<figure class="gi reveal" data-cat="${esc(g.cat)}"><button type="button" class="gi-btn" data-lb="${u('assets/img/' + g.img)}" data-lb-group="${group}" data-lb-cap="${esc(g.title)}">${phImg(u, 'assets/img/' + g.img, g.title, { sizes: '(max-width: 760px) 50vw, 25vw' })}</button><figcaption><strong>${esc(g.title)}</strong><time datetime="${g.date}">${kdate(g.date)}</time></figcaption></figure>`).join('');
}
const tabsBar = (id, tabs) => `<div class="tabs" role="tablist" data-tabs="${id}">${tabs.map(([k, t], i) => `<button type="button" role="tab" id="tab-${id}-${i}" aria-controls="pane-${id}-${i}" aria-selected="${i === 0}" data-tab="${esc(k)}">${esc(t)}</button>`).join('')}</div>`;

// ── 홈 ──
export function home(u) {
  // 기존 홈페이지 메인 바로가기 6칸(원본 아이콘 main-nav1~6) · 요금표 카드 5장(원본 이미지 sec6-bg1~5) 그대로
  const quick = [['요금안내', 'rates/lift/'], ['강습안내', 'lesson/'], ['견적문의', 'quote/'], ['예약하기', 'reserve/'], ['갤러리', 'gallery/'], ['오시는 길', 'location/']];
  const rateCards = [['용평리프트 요금표', 'rates/lift/#yongpyong'], ['알펜시아리프트 요금표', 'rates/lift/#alpensia'], ['장비 요금표', 'rates/rental/#gear'], ['의류 요금표', 'rates/rental/#wear'], ['보호장비 요금표', 'rates/rental/#safety']];
  const steps = [['날짜·스키장 선택', '이용 날짜와 용평·알펜시아 중 스키장, 이용타임(1·2·3타임)을 고릅니다.'], ['렌탈·강습 선택', '스키·보드 장비, 의류, 강습 종목·인원·시간을 함께 고릅니다.'], ['확인 연락', '접수 내용을 확인해 전화나 문자로 안내드립니다. 리프트권은 이용 1일 전까지 예약해야 할인됩니다.']];
  return `
<section class="hero" data-hero>
  <video class="hero-v" muted playsinline loop preload="metadata" poster="${u('assets/video/hero-poster.jpg')}" data-poster-m="${u('assets/video/hero-poster-m.jpg')}" data-src-xl="${u('assets/video/hero-1920.mp4')}" data-src="${u('assets/video/hero-1280.mp4')}" data-src-m="${u('assets/video/hero-m.mp4')}" aria-label="뽀드득 스키 영상: 슬로프를 내려오는 스키어들, 마지막에 뽀드득 로고"></video>
  <h1 class="sr">용평·알펜시아 스키 렌탈·강습 뽀드득 — 눈밭 위 ‘뽀드득’ 소리와 함께, 당신의 겨울이 시작됩니다</h1>
  <div class="hero-ctl"><button type="button" class="icon-btn glass" data-hero-sound aria-pressed="false" aria-label="소리 켜기">${ICON.mute}</button><button type="button" class="icon-btn glass" data-hero-replay aria-label="처음부터 다시 보기">${ICON.replay}</button></div>
</section>

<section class="main-nav" id="quick" aria-label="바로가기"><div class="mn-wrap"><ul class="mn-list">${quick.map(([t, h], i) => `<li><a href="${u(h)}"><img src="${u(`assets/img/main/main-nav${i + 1}.png`)}" alt="" width="64" height="64"><span class="mn-txt">${t}</span></a></li>`).join('')}</ul></div></section>

<section class="sec sec-about"><div class="wrap about-grid">
  <div class="reveal">
    <p class="eyebrow">ABOUT PPODDEUDEUK</p>
    <h2 class="h2">뽀드득은 어떤 곳인가요?</h2>
    <p class="answer-p"><strong>뽀드득은 강원 평창군 대관령면 올림픽로 238에 있는 스키·스노보드 렌탈과 강습 전문점입니다.</strong> 용평리조트(모나 용평)와 알펜시아 스키장까지 차로 약 5분 거리이고, 리프트권 할인 예약, 장비·의류 렌탈, 1:1·2:1 강습을 함께 안내합니다.</p>
    <ul class="facts">
      <li><b>리프트권</b>용평 1타임 대인 ${won(68000)} → <em>${won(34000)}</em></li>
      <li><b>장비 렌탈</b>초급자 스키·보드 1타임 <em>${won(15000)}</em>부터</li>
      <li><b>강습</b>1:1 2시간 <em>${man(200000)}</em>, 스키·보드 동일</li>
      <li><b>위치</b>${esc(SITE.near)}</li>
    </ul>
    <a class="link-more" href="${u('about/')}">소개 및 내부전경 보기 ${ICON.arrow}</a>
  </div>
  <div class="about-photos reveal">${['interior-5', 'interior-1', 'interior-3'].map((k, i) => `<button type="button" class="ap ap-${i}" data-lb="${u(`assets/img/store/${k}.webp`)}" data-lb-group="home-store" data-lb-cap="${esc(ABOUT.interior.find(x => x[0] === k)[1])}">${phImg(u, `assets/img/store/${k}.webp`, ABOUT.interior.find(x => x[0] === k)[1], { sizes: '(max-width: 760px) 50vw, 25vw' })}</button>`).join('')}</div>
</div></section>

<section class="sec main-rates" id="rates">
  <div class="wrap m-tit reveal"><h2>뽀드득 요금표</h2><p>뽀드득에서만 만나볼 수 있는 <span class="t-red">전용 할인가</span>로 더욱 부담 없이 스키를 즐겨보세요.</p></div>
  <div class="rate-cards reveal">${rateCards.map(([t, h], i) => `<div class="item"><a href="${u(h)}" style="background-image:url('${u(`assets/img/main/rate-${i + 1}.webp`)}')"><p>${t}</p></a></div>`).join('')}</div>
</section>

<section class="sec sec-lesson"><div class="wrap lesson-grid">
  <div class="reveal">
    <p class="eyebrow">LESSON</p><h2 class="h2">스키·보드 강습은 1:1과 2:1만 운영합니다</h2>
    <p>${esc(LESSON_FEE.note)} 3명 이상 강습과 1시간 강습은 진행하지 않습니다.</p>
    ${lessonTable()}
    <a class="link-more" href="${u('lesson/')}">강습 요금 자세히 ${ICON.arrow}</a>
  </div>
  <ol class="lv-cards reveal">${PROGRAM.map((lv, i) => `<li><a href="${u('lesson/program/#' + lv.id)}"><span class="lv-no">0${i + 1}</span><strong>${esc(lv.name)}</strong><span>${esc(lv.lead)}</span></a></li>`).join('')}</ol>
</div></section>

<section class="sec sec-gallery"><div class="wrap">
  <div class="sec-hd reveal"><p class="eyebrow">GALLERY</p><h2 class="h2">뽀드득 갤러리</h2><p>매장 장비와 의류, 새로 들어온 장비를 사진으로 확인하세요.</p></div>
  ${tabsBar('gal', [['all', '전체'], ...GALLERY_CATS.map(c => [c, c])])}
  <div class="gal-grid" data-filter-grid="gal">${galleryItems(u, GALLERY.slice(0, 8), 'home-gal')}<p class="gal-empty" hidden>등록된 사진을 준비하고 있습니다.</p></div>
  <p class="center"><a class="btn btn-line" href="${u('gallery/')}">갤러리 전체 보기</a></p>
</div></section>

<section class="sec sec-steps"><div class="wrap">
  <div class="sec-hd reveal"><p class="eyebrow">HOW TO BOOK</p><h2 class="h2">예약은 이렇게 진행됩니다</h2></div>
  <ol class="steps-row">${steps.map(([t, d], i) => `<li class="reveal"><span class="st-no">STEP ${i + 1}</span><strong>${t}</strong><p>${d}</p></li>`).join('')}</ol>
  <p class="center"><a class="btn btn-red btn-lg" href="${u('reserve/')}">${ICON.cal}지금 예약하기</a></p>
</div></section>

<section class="sec sec-notice-faq"><div class="wrap nf-grid">
  <div class="reveal"><div class="nf-hd"><h2 class="h3">공지사항</h2><a class="plus" href="${u('notice/')}" aria-label="공지사항 더 보기">+</a></div>
    <ul class="notice-list">${NOTICES.map(n => `<li><a href="${u('notice/#' + n.id)}"><span>${esc(n.title)}</span><time datetime="${n.date}">${kdate(n.date)}</time></a></li>`).join('')}</ul></div>
  <div class="reveal"><div class="nf-hd"><h2 class="h3">자주 묻는 질문</h2><a class="plus" href="${u('faq/')}" aria-label="자주 묻는 질문 더 보기">+</a></div>
    ${faqList(FAQ.filter(f => f.pages.includes('home')).slice(0, 6))}</div>
</div></section>

<section class="main-contact" id="contact">
  <div class="mc-map map reveal" data-roughmap="${SITE.maps.roughmap.timestamp}" data-roughmap-key="${SITE.maps.roughmap.key}" data-map-h="520"><div id="daumRoughmapContainer${SITE.maps.roughmap.timestamp}" class="root_daum_roughmap root_daum_roughmap_landing"></div><div class="map-ph ph"><span>${ICON.pin}지도를 불러오는 중입니다</span></div></div>
  <div class="mc-info reveal">
    <div class="m-tit"><h2>Contact Us</h2><p>${esc(SITE.address.full)}</p></div>
    <div class="row">
      <p class="tel"><img src="${u('assets/img/main/icon-phone.png')}" alt="" width="34" height="34"><a href="${SITE.phoneHref}">${SITE.phone}</a></p>
      <p class="txt"><strong>예약, 문의, 강습 관련 궁금하신 사항은 언제든지 연락주시기 바랍니다.</strong></p>
      <p class="txt">초보 강습부터 가족·단체 이용까지, 문의 주시면 친절하고 상세하게 상담해드립니다.</p>
      <div class="mc-btns"><a class="btn btn-red" href="${SITE.phoneHref}">${ICON.phone}전화하기</a><a class="btn btn-line" href="${SITE.maps.kakao}" target="_blank" rel="noopener">카카오맵</a><a class="btn btn-line" href="${SITE.maps.naver}" target="_blank" rel="noopener">네이버 지도</a><button type="button" class="btn btn-line" data-copy="${esc(SITE.address.full)}">${ICON.copy}주소 복사</button></div>
    </div>
  </div>
</section>`;
}

// ── 뽀드득 안내 ──
export function about(u) {
  return subHead(u, { eyebrow: 'ABOUT', title: '소개 및 내부전경', lead: ABOUT.lead, bg: 'scene/lineup.webp', crumbs: [['뽀드득 안내', 'about/'], ['소개 및 내부전경']] })
    + subTabs(u, [['소개 및 내부전경', 'about/'], ['오시는 길', 'location/'], ['공지사항', 'notice/'], ['자주 묻는 질문', 'faq/']], 'about/')
    + `<section class="sec"><div class="wrap narrow">
  ${answer('뽀드득은 어떤 곳인가요?', `<strong>뽀드득은 프리미엄 스키·스노보드 렌탈과 전문 강습을 함께 운영하는 스키 파트너입니다.</strong> ${esc(SITE.address.full)}에 있고, ${esc(SITE.near)} 거리입니다. 25/26 시즌 겨울바라기에서 뽀드득으로 새롭게 단장했습니다.`)}
  <div class="prose reveal">${ABOUT.paras.map(p => `<p>${esc(p)}</p>`).join('')}</div>
  <dl class="branch reveal"><div><dt>렌탈샵</dt><dd>${BRANCHES.rental.map(esc).join(', ')}</dd></div><div><dt>강습센터</dt><dd>${BRANCHES.lesson.map(esc).join(', ')}</dd></div></dl>
</div></section>
<section class="sec sec-tint"><div class="wrap">
  <div class="sec-hd reveal"><p class="eyebrow">INTERIOR</p><h2 class="h2">내부전경</h2><p>현장 방문 전, 내부 전경을 미리 확인해보세요.</p></div>
  <div class="gal-grid g3">${ABOUT.interior.map(([k, t]) => `<figure class="gi reveal"><button type="button" class="gi-btn" data-lb="${u(`assets/img/store/${k}.webp`)}" data-lb-group="interior" data-lb-cap="${esc(t)}">${phImg(u, `assets/img/store/${k}.webp`, t, { sizes: '(max-width: 760px) 50vw, 33vw' })}</button><figcaption><strong>${esc(t)}</strong></figcaption></figure>`).join('')}</div>
</div></section>` + ctaBand(u);
}

export function location(u) {
  const rows = [['도로명 주소', SITE.address.full], ['지번 주소', SITE.address.old], ['대표전화', `<a href="${SITE.phoneHref}">${SITE.phone}</a>`], ['영업시간', esc(SITE.hours)], ['가까운 스키장', esc(SITE.near)]];
  return subHead(u, { eyebrow: 'LOCATION', title: '오시는 길', lead: '주소 및 연락처 안내', bg: 'scene/crew.webp', crumbs: [['뽀드득 안내', 'about/'], ['오시는 길']] })
    + subTabs(u, [['소개 및 내부전경', 'about/'], ['오시는 길', 'location/'], ['공지사항', 'notice/'], ['자주 묻는 질문', 'faq/']], 'location/')
    + `<section class="sec"><div class="wrap loc-grid">
  <div class="reveal">
    ${answer('뽀드득은 어디에 있나요?', `<strong>${esc(SITE.address.full)}</strong>(지번 ${esc(SITE.address.old)})에 있습니다. ${esc(SITE.near)} 거리입니다.`)}
    <table class="tbl tbl-kv"><caption class="sr">주소와 연락처</caption><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>
    <div class="loc-btns"><a class="btn btn-red" href="${SITE.phoneHref}">${ICON.phone}전화하기</a><button type="button" class="btn btn-line" data-copy="${esc(SITE.address.full)}">${ICON.copy}주소 복사</button><a class="btn btn-line" href="${SITE.maps.kakao}" target="_blank" rel="noopener">카카오 지도 크게 보기</a><a class="btn btn-line" href="${SITE.maps.naver}" target="_blank" rel="noopener">네이버 지도 크게 보기</a></div>
  </div>
  <div class="map reveal" data-roughmap="${SITE.maps.roughmap.timestamp}" data-roughmap-key="${SITE.maps.roughmap.key}" data-map-h="460"><div id="daumRoughmapContainer${SITE.maps.roughmap.timestamp}" class="root_daum_roughmap root_daum_roughmap_landing"></div><div class="map-ph ph"><span>${ICON.pin}지도를 불러오는 중입니다</span></div></div>
</div></section>` + `<section class="sec sec-tint"><div class="wrap narrow">${faqList(FAQ.filter(f => f.pages.includes('location')), true)}</div></section>`;
}

export function notice(u) {
  return subHead(u, { eyebrow: 'NOTICE', title: '공지사항', bg: 'scene/group.webp', crumbs: [['뽀드득 안내', 'about/'], ['공지사항']] })
    + subTabs(u, [['소개 및 내부전경', 'about/'], ['오시는 길', 'location/'], ['공지사항', 'notice/'], ['자주 묻는 질문', 'faq/']], 'notice/')
    + `<section class="sec"><div class="wrap narrow">
  <p class="count">전체 <b>${NOTICES.length}</b>건</p>
  <div class="board">${NOTICES.map((n, i) => `<details class="acc post" id="${n.id}"${i === 0 ? ' open' : ''}><summary><span class="no">${NOTICES.length - i}</span><h2>${esc(n.title)}</h2><time datetime="${n.date}">${kdate(n.date)}</time>${ICON.chev}</summary><div class="acc-body">${n.body.map(p => `<p>${esc(p)}</p>`).join('')}</div></details>`).join('')}</div>
</div></section>`;
}

export function faqPage(u) {
  return subHead(u, { eyebrow: 'FAQ', title: '자주 묻는 질문', lead: '리프트권·렌탈·강습·예약에 대해 가장 많이 묻는 질문입니다.', bg: 'scene/spray.webp', crumbs: [['뽀드득 안내', 'about/'], ['자주 묻는 질문']] })
    + subTabs(u, [['소개 및 내부전경', 'about/'], ['오시는 길', 'location/'], ['공지사항', 'notice/'], ['자주 묻는 질문', 'faq/']], 'faq/')
    + `<section class="sec"><div class="wrap narrow">${faqList(FAQ, true)}</div></section>` + ctaBand(u);
}

// ── 갤러리 ──
export function gallery(u) {
  return subHead(u, { eyebrow: 'GALLERY', title: '갤러리', lead: '의류 · 장비 · 장비관리 · 강습', bg: 'scene/duo.webp', crumbs: [['갤러리']] })
    + `<section class="sec"><div class="wrap">
  ${tabsBar('gal', [['all', '전체'], ...GALLERY_CATS.map(c => [c, c + ' 갤러리'])])}
  <div class="gal-grid" data-filter-grid="gal">${galleryItems(u, GALLERY, 'gal')}<p class="gal-empty" hidden>등록된 사진을 준비하고 있습니다.</p></div>
  <p class="note">중고장비 직거래 사진은 <a href="${u('secondhand/')}">중고장비 직거래장터</a>에서 볼 수 있습니다.</p>
</div></section>`;
}
export function secondhand(u) {
  return subHead(u, { eyebrow: 'USED GEAR', title: '중고장비 직거래장터', lead: '뽀드득에서 사용한 장비를 직거래로 판매합니다.', bg: 'scene/carve.webp', crumbs: [['중고장비 직거래장터']] })
    + `<section class="sec"><div class="wrap">
  <p class="count">전체 <b>${USED.length}</b>건 · 판매 여부와 상태는 전화로 확인해 주세요.</p>
  <div class="used-grid">${USED.map(it => `<article class="used reveal"><button type="button" class="gi-btn" data-lb="${u('assets/img/' + it.img)}" data-lb-group="used" data-lb-cap="${esc(it.title)}">${phImg(u, 'assets/img/' + it.img, it.title, { sizes: '(max-width: 760px) 100vw, 33vw' })}</button><div class="used-b"><h2>${esc(it.title)}</h2><p>${esc(it.body)}</p><p class="used-meta"><strong>${won(it.price)}</strong><span>수량 ${it.qty}대</span><time datetime="${it.date}">${kdate(it.date)} 등록</time></p><a class="btn btn-line btn-sm" href="${SITE.phoneHref}">${ICON.phone}구매 문의</a></div></article>`).join('')}</div>
</div></section>`;
}

// ── 요금안내 ──
const rateTabs = [['리프트 요금', 'rates/lift/'], ['렌탈 요금', 'rates/rental/']];
export function lift(u) {
  return subHead(u, { eyebrow: 'LIFT', title: '리프트 요금', lead: `${SITE.season} 용평리조트·알펜시아리조트 리프트권 뽀드득 예약 할인가`, bg: 'scene/lineup.webp', crumbs: [['요금안내', 'rates/lift/'], ['리프트 요금']] })
    + subTabs(u, rateTabs, 'rates/lift/')
    + `<section class="sec"><div class="wrap">
  ${answer('용평·알펜시아 리프트권, 뽀드득에서 예약하면 얼마인가요?', `<strong>용평리조트 1타임 대인 리프트권은 정상가 ${won(68000)}에서 뽀드득 예약가 ${won(34000)}, 2타임 대인은 ${won(96000)}에서 ${won(48000)}입니다.</strong> 이용 1일 전까지 전화 예약이 필수이며, 용평은 사전 예약 시 약 40%·당일 약 35%, 알펜시아는 사전 예약 시 약 45%·당일 약 40% 할인가가 적용됩니다.`)}
  ${LIFT.map(l => `<div class="rate-block reveal" id="${l.id}"><h2 class="h3">${esc(l.title)}</h2><p class="callout">${esc(l.note)}</p><div class="only-pc">${liftTable(l)}</div><div class="only-m">${liftCards(l)}</div></div>`).join('')}
  <h2 class="h3">스키장별 이용타임과 정설시간</h2>
  ${timeTable()}
  <p class="note">요금과 할인율은 ${SITE.season} 기준이며 리조트 사정에 따라 바뀔 수 있습니다. 예약 시 최종 금액을 안내드립니다.</p>
</div></section>
<section class="sec sec-tint"><div class="wrap narrow">${faqList(FAQ.filter(f => f.pages.includes('lift')), true)}</div></section>` + ctaBand(u);
}
export function timeTable() {
  return `<div class="tbl-wrap reveal"><table class="tbl tbl-time"><caption>스키장별 이용타임(예약 기준)</caption><thead><tr><th scope="col">구분</th>${RESORTS.map(r => `<th scope="col">${r.name}</th>`).join('')}</tr></thead><tbody>${RESORTS[0].times.map((t, ti) => `<tr><th scope="row">${t.name}</th>${RESORTS.map(r => `<td>${r.times[ti].opts.map(([n, h]) => `<span class="tt"><b>${n}</b> ${h}</span>`).join('')}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">정설시간</th>${RESORTS.map(r => `<td><span class="tt"><b>${r.grooming}</b> ${r.groomingNote}</span></td>`).join('')}</tr></tbody></table></div>`;
}
export function rental(u) {
  return subHead(u, { eyebrow: 'RENTAL', title: '렌탈 요금', lead: `${SITE.season} 용평리조트 렌탈 요금표 · 장비 · 의류 · 안전장비`, bg: 'scene/spray.webp', crumbs: [['요금안내', 'rates/lift/'], ['렌탈 요금']] })
    + subTabs(u, rateTabs, 'rates/rental/')
    + `<section class="sec"><div class="wrap">
  ${answer('용평 스키 장비·스키복 렌탈은 얼마인가요?', `<strong>프리미엄 초급자 스키·보드는 1타임(오전·오후·야간 중 택1) 예약가 ${won(15000)}, 2타임(주간·오후야간 중 택1) ${won(20000)}입니다.</strong> 중급자·숏스키·블레이드는 1타임 ${won(25000)}, 하이엔드 상급자 ${won(40000)}, 최상급자 ${won(70000)}입니다. 스키복은 프리미엄 고급의류 ${won(20000)}, 하이엔드 최고급의류 ${won(30000)}(1타임 예약가)이고 헬멧·고글·보호대는 ${won(5000)}입니다.`)}
  <div class="only-pc reveal">${rentalTable()}</div>
  <div class="only-m">${RENTAL.map(g => `<h2 class="h3" data-anchor="${g.key}">${g.group}</h2>${rentalCards(g.key)}`).join('')}</div>
  <p class="note">‘문의’는 기존 요금표에 금액이 정해지지 않은 항목입니다. 전화로 안내드립니다. 보유 브랜드와 모델은 시즌마다 바뀔 수 있습니다.</p>
  <figure class="wide-photo reveal">${img(u, 'assets/img/gallery/gear-volkl.webp', '매장에 진열된 뵐클 중급자 스키', { sizes: '(max-width: 760px) 100vw, 1100px' })}<figcaption>새로 입고된 뵐클 중급자 스키</figcaption></figure>
</div></section>
<section class="sec sec-tint"><div class="wrap narrow">${faqList(FAQ.filter(f => f.pages.includes('rental')), true)}</div></section>` + ctaBand(u);
}

// ── 숙박안내 ──
export function stay(u, s) {
  const tabs = [['타워 콘도', 'stay/tower/'], ['빌라 콘도', 'stay/villa/'], ['그린피아 콘도', 'stay/greenpia/']];
  const typeTabs = s.types.length > 1 ? tabsBar('type', s.types.map(t => [t.key, t.label])) : '';
  const panes = s.types.map((t, i) => `<div class="tab-pane"${s.types.length > 1 ? ` role="tabpanel" id="pane-type-${i}" aria-labelledby="tab-type-${i}"` : ''}${i ? ' hidden' : ''}>
    <div class="slider" data-slider><div class="slides">${Array.from({ length: t.photos }, (_, k) => `<button type="button" class="slide" data-lb="${u(`assets/img/stay/${t.key}-${k + 1}.webp`)}" data-lb-group="${t.key}" data-lb-cap="${esc(t.caption)}">${phImg(u, `assets/img/stay/${t.key}-${k + 1}.webp`, `${t.caption} 객실 사진 ${k + 1}`, { sizes: '(max-width: 760px) 90vw, 760px', lazy: k > 0 })}</button>`).join('')}</div>
      <button type="button" class="sl-nav sl-prev" aria-label="이전 사진">‹</button><button type="button" class="sl-nav sl-next" aria-label="다음 사진">›</button><p class="sl-count"><span>1</span> / ${t.photos}</p></div>
    <h3 class="h4">객실 정보</h3>
    <div class="tbl-wrap"><table class="tbl"><caption>${esc(t.caption)} 객실 정보</caption><thead><tr><th scope="col">구분</th><th scope="col">객실타입</th><th scope="col">객실수</th><th scope="col">객실구성</th><th scope="col">투숙인원</th></tr></thead><tbody>${t.rooms.map(r => `<tr>${r.map((c, ci) => ci === 4 && c === '문의' ? `<td>${price(0)}</td>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <h3 class="h4">객실 내 인터넷 이용</h3><p>전 객실에 무선 인터넷(Wi-Fi) 환경을 갖추고 있어, 객실 어디에서든 편리하게 연결하여 사용하실 수 있습니다.</p>
    <h3 class="h4">비품 정보</h3>
    <table class="tbl tbl-kv"><caption class="sr">${esc(t.caption)} 비품 정보</caption><tbody><tr><th scope="row">가전류</th><td>${s.amenity.appliance}</td></tr><tr><th scope="row">식기류</th><td>${s.amenity.kitchen}</td></tr><tr><th scope="row">침구류</th><td>${esc(t.bedding)}</td></tr><tr><th scope="row">세면류</th><td>${s.amenity.bath}</td></tr>${t.pet ? `<tr><th scope="row">펫 비품</th><td>${esc(t.pet)}</td></tr>` : ''}</tbody></table>
  </div>`).join('');
  return subHead(u, { eyebrow: 'STAY', title: `${s.name} 소개`, lead: s.lead, bg: 'scene/group.webp', crumbs: [['숙박안내', 'stay/tower/'], [s.name]] })
    + subTabs(u, tabs, `stay/${s.slug}/`)
    + `<section class="sec"><div class="wrap narrow">
  ${answer(`용평리조트 ${s.name}는 어떤 객실이 있나요?`, `<strong>${s.types.map(t => `${t.caption}: ${t.rooms.map(r => `${r[1]} ${r[2]}(${r[4] === '문의' ? '투숙인원 문의' : r[4]})`).join(', ')}`).join(' / ')}</strong>입니다. 숙박 문의는 ${SITE.phone}로 연락 주세요.`)}
  ${typeTabs}${panes}
  <p class="note">알펜시아 콘도 안내는 준비 중입니다. 객실 사진과 정보는 기존 홈페이지 안내를 그대로 옮겼습니다.</p>
</div></section>` + ctaBand(u);
}

// ── 강습안내 ──
const lessonTabs = [['강습 요금', 'lesson/'], ['강사진 소개', 'lesson/instructors/'], ['강습 프로그램', 'lesson/program/']];
export function lessonFee(u) {
  return subHead(u, { eyebrow: 'LESSON', title: '강습 요금', lead: '1:1 개인 강습 · 2:1 소수 강습 · 스키와 보드 동일', bg: 'scene/carve.webp', crumbs: [['강습안내', 'lesson/'], ['강습 요금']] })
    + subTabs(u, lessonTabs, 'lesson/')
    + `<section class="sec"><div class="wrap narrow">
  ${answer('스키·보드 강습 요금은 얼마인가요?', `<strong>1:1 강습은 2시간 ${man(200000)}, 3시간 ${man(250000)}, 4시간 ${man(300000)}이고, 2:1 강습은 2시간 ${man(250000)}, 3시간 ${man(300000)}, 4시간 ${man(350000)}입니다.</strong> 스키와 보드 강습 비용은 같습니다.`)}
  <p class="callout reveal">${esc(LESSON_FEE.note)}</p>
  <div class="reveal">${lessonTable()}</div>
  <h2 class="h3">강습 운영 원칙</h2><ul class="check reveal">${LESSON_FEE.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
  <p class="center"><a class="btn btn-red btn-lg" href="${u('reserve/')}">${ICON.cal}강습 예약하기</a> <a class="btn btn-line btn-lg" href="${u('lesson/program/')}">강습 프로그램 보기</a></p>
</div></section>
<section class="sec sec-tint"><div class="wrap narrow">${faqList(FAQ.filter(f => f.pages.includes('lesson')), true)}</div></section>`;
}
export function program(u) {
  return subHead(u, { eyebrow: 'PROGRAM', title: '강습 프로그램', lead: '처음단계부터 상급단계까지 4단계로 진행합니다.', bg: 'scene/spray.webp', crumbs: [['강습안내', 'lesson/'], ['강습 프로그램']] })
    + subTabs(u, lessonTabs, 'lesson/program/')
    + `<section class="sec"><div class="wrap">
  ${answer('스키 강습은 어떤 단계로 진행되나요?', '<strong>처음단계 → 초급단계(단계 1~4) → 중급단계(단계 1~2) → 상급단계 순서로 진행합니다.</strong> 처음단계는 안전수칙과 장비 다루기, 넘어지고 일어나는 법, 푸르그 화렌(A자 정지)까지, 상급단계는 카빙 롱턴·숏턴으로 다양한 슬로프를 종합활강하는 것을 목표로 합니다.')}
  <div class="lv-list">${PROGRAM.map((lv, i) => programBlock(lv, i, i === 0)).join('')}</div>
</div></section>
<section class="sec sec-tint"><div class="wrap narrow"><h2 class="h3">자주 묻는 질문 (FAQ)</h2>${faqList(FAQ.filter(f => f.pages.includes('lesson')), true)}</div></section>` + ctaBand(u);
}
export function instructors(u) {
  return subHead(u, { eyebrow: 'INSTRUCTORS', title: '강사진 소개', lead: '공식 자격을 보유한 강사진이 수준별 맞춤 강습으로 안전하고 즐거운 스키를 도와드립니다.', bg: 'scene/duo.webp', crumbs: [['강습안내', 'lesson/'], ['강사진 소개']] })
    + subTabs(u, lessonTabs, 'lesson/instructors/')
    + `<section class="sec"><div class="wrap narrow">
  <div class="empty-card reveal">${ICON.user}<h2 class="h3">강사 프로필을 준비하고 있습니다</h2><p>뽀드득 소속 강사진은 공식 자격을 갖추고, 초급부터 상급까지 수준별·목표별 맞춤 강습을 진행합니다. 강사별 자격과 경력은 곧 이곳에 소개합니다. 강습 상담은 전화로 문의해 주세요.</p><p><a class="btn btn-red" href="${SITE.phoneHref}">${ICON.phone}${SITE.phone}</a> <a class="btn btn-line" href="${u('lesson/program/')}">강습 프로그램 보기</a></p></div>
</div></section>`;
}

// ── 견적문의·예약하기 (기존 게시판형 폼 15칸 → 3단계 접수) ──
export function bookForm(u, type) {
  const isQ = type === 'quote';
  const chips = (name, items) => items.map(it => `<label class="chip"><input type="checkbox" name="${name}" value="${esc(it)}"><span>${esc(it)}</span></label>`).join('');
  const wearItems = RENTAL_ITEMS.wear.flatMap(([n, parts]) => [n, ...parts.map(p => `${n.replace(' 의류세트', '')} ${p}만`)]);
  return `<form class="book" data-book="${type}" novalidate>
  <ol class="book-steps" aria-hidden="true"><li class="is-on"><span>1</span>날짜·스키장</li><li><span>2</span>렌탈·강습</li><li><span>3</span>연락처</li></ol>
  <fieldset class="bstep is-on" data-step="1"><legend class="sr">1단계 날짜·스키장</legend>
    <div class="fld"><label for="${type}-date">이용날짜 <i>*</i></label><input type="date" id="${type}-date" name="date" required></div>
    <div class="fld"><span class="lbl">스키장 선택 <i>*</i></span><div class="seg">${RESORTS.map((r, i) => `<label class="seg-it"><input type="radio" name="resort" value="${r.id}" required${i === 0 ? '' : ''}><span><b>${r.name}</b><small>정설 ${r.grooming}</small></span></label>`).join('')}</div>
      <p class="hint" data-grooming>선택하신 스키장에 따라 시간대가 달라집니다.</p></div>
    <div class="fld"><span class="lbl">이용타임 <i>*</i></span><div class="time-opts" data-time-opts><p class="hint">스키장을 먼저 선택해 주세요.</p></div></div>
    <div class="fld"><label for="${type}-people">이용 인원</label><input type="number" id="${type}-people" name="people" min="1" max="99" inputmode="numeric" placeholder="예: 4"></div>
    <div class="bnav"><span></span><button type="button" class="btn btn-red" data-next>다음 단계</button></div>
  </fieldset>
  <fieldset class="bstep" data-step="2"><legend class="sr">2단계 렌탈·강습</legend>
    <p class="hint">필요한 것만 고르세요. 수량은 요청사항에 적어 주시면 됩니다.</p>
    <div class="fld"><span class="lbl">스키장비 렌탈</span><div class="chips">${chips('ski', RENTAL_ITEMS.ski)}</div></div>
    <div class="fld"><span class="lbl">보드장비 렌탈</span><div class="chips">${chips('board', RENTAL_ITEMS.board)}</div></div>
    <div class="fld"><span class="lbl">의류 렌탈</span><div class="chips">${chips('wear', wearItems)}</div></div>
    <div class="fld-row">
      <div class="fld"><span class="lbl">강습 종목</span><div class="seg seg-sm">${['선택 안 함', '스키', '보드'].map((t, i) => `<label class="seg-it"><input type="radio" name="lesson" value="${i ? t : ''}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <div class="fld"><label for="${type}-lp">강습 인원</label><select id="${type}-lp" name="lessonPeople" disabled><option value="">선택</option><option>1명</option><option>2명</option></select></div>
      <div class="fld"><label for="${type}-lh">강습 시간</label><select id="${type}-lh" name="lessonHours" disabled><option value="">선택</option><option>2시간</option><option>3시간</option><option>4시간</option></select></div>
    </div>
    <p class="hint">강습은 1:1·2:1만 운영하며(3명 이상 불가), 2·3·4시간 단위입니다.</p>
    <div class="bnav"><button type="button" class="btn btn-line" data-prev>이전</button><button type="button" class="btn btn-red" data-next>다음 단계</button></div>
  </fieldset>
  <fieldset class="bstep" data-step="3"><legend class="sr">3단계 연락처</legend>
    <div class="fld-row">
      <div class="fld"><label for="${type}-name">작성자명 <i>*</i></label><input id="${type}-name" name="name" autocomplete="name" required maxlength="30"></div>
      <div class="fld"><label for="${type}-phone">전화번호 <i>*</i></label><input id="${type}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="010-0000-0000" maxlength="13"></div>
    </div>
    <div class="fld"><label for="${type}-memo">특이사항 및 요청사항</label><textarea id="${type}-memo" name="memo" rows="4" maxlength="1000" placeholder="장비 수량, 키·발 사이즈, 단체 여부 등"></textarea></div>
    <details class="agree-box"><summary>개인정보 수집 및 이용에 대한 안내 ${ICON.chev}</summary><p>${esc(PRIVACY.short)}</p><dl>${PRIVACY.items.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>
    <label class="agree"><input type="checkbox" name="agree" required><span>개인정보 수집 및 이용에 동의합니다. <i>*</i></span></label>
    <input type="text" name="company" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="bnav"><button type="button" class="btn btn-line" data-prev>이전</button><button type="submit" class="btn btn-red">${isQ ? '견적 요청하기' : '예약 접수하기'}</button></div>
  </fieldset>
  <div class="bdone" hidden tabindex="-1">
    <h2 class="h3" data-done-title>접수 내용을 확인해 주세요</h2>
    <p data-done-lead></p>
    <pre class="summary" data-summary></pre>
    <div class="done-btns"><a class="btn btn-red" data-sms href="#">${ICON.sms}문자로 보내기</a><button type="button" class="btn btn-line" data-copy-summary>${ICON.copy}내용 복사</button><a class="btn btn-line" href="${SITE.phoneHref}">${ICON.phone}전화하기</a></div>
    <button type="button" class="link-more" data-restart>처음부터 다시 작성 ${ICON.arrow}</button>
  </div>
</form>`;
}
export function book(u, type) {
  const isQ = type === 'quote';
  return subHead(u, { eyebrow: isQ ? 'ESTIMATE' : 'RESERVATION', title: isQ ? '견적문의' : '예약하기', lead: isQ ? '이용 날짜와 스키장, 필요한 장비·강습을 알려 주시면 견적을 안내드립니다.' : '날짜·스키장 → 렌탈·강습 → 연락처, 3단계로 예약을 접수합니다.', bg: isQ ? 'scene/group.webp' : 'scene/lineup.webp', crumbs: [[isQ ? '견적문의' : '예약하기']] })
    + subTabs(u, [['예약하기', 'reserve/'], ['견적문의', 'quote/']], isQ ? 'quote/' : 'reserve/')
    + `<section class="sec"><div class="wrap book-grid">
  <div>${bookForm(u, type)}</div>
  <aside class="book-aside">
    <div class="aside-card"><h2 class="h4">전화로 바로 예약</h2><p class="big-tel"><a href="${SITE.phoneHref}">${SITE.phone}</a></p><p>리프트권 할인은 <b>이용 1일 전까지 유선 예약</b>이 필수입니다.</p></div>
    <div class="aside-card"><h2 class="h4">스키장별 정설시간</h2><ul>${RESORTS.map(r => `<li><b>${r.short}</b> ${r.grooming} (${r.groomingNote})</li>`).join('')}</ul></div>
    <div class="aside-card"><h2 class="h4">개인정보 안내</h2><p>${esc(PRIVACY.short)}</p></div>
  </aside>
</div></section>
<section class="sec sec-tint"><div class="wrap narrow"><h2 class="h3">이용타임 안내</h2>${timeTable()}${faqList(FAQ.filter(f => f.pages.includes('reserve')), false)}</div></section>`;
}

export function privacy(u) {
  return subHead(u, { eyebrow: 'PRIVACY', title: '개인정보처리방침', bg: 'scene/group.webp', crumbs: [['개인정보처리방침']] })
    + `<section class="sec"><div class="wrap narrow prose">
  <p>${SITE.name}(${esc(SITE.operator)})은 견적·예약 상담에 필요한 최소한의 정보만 수집하며, 관계법령에 따라 다음과 같이 안내합니다.</p>
  <p>${esc(PRIVACY.short)}</p>
  <table class="tbl tbl-kv"><caption class="sr">개인정보 수집 및 이용</caption><tbody>${PRIVACY.items.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join('')}<tr><th scope="row">동의 거부 권리</th><td>개인정보 수집에 동의하지 않을 수 있으며, 이 경우 홈페이지 접수 대신 전화로 상담받을 수 있습니다.</td></tr><tr><th scope="row">제3자 제공</th><td>수집한 정보는 상담과 예약 진행 외의 목적으로 이용하거나 제3자에게 제공하지 않습니다.</td></tr></tbody></table>
  <p class="note">시행일: ${kdate(SITE.asof)}</p>
</div></section>`;
}
export function notFound(u) {
  return `<section class="sec nf"><div class="wrap narrow center"><p class="eyebrow">404</p><h1 class="h2">페이지를 찾을 수 없습니다</h1><p>주소가 바뀌었거나 없는 페이지입니다.</p><p><a class="btn btn-red" href="${u('')}">홈으로</a> <a class="btn btn-line" href="${u('reserve/')}">예약하기</a></p></div></section>`;
}
