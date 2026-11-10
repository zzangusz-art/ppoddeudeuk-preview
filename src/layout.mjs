// 공용 틀: <head>, 헤더(기존 사이트 메뉴 구조 그대로), 메뉴 드로어, 푸터, 모바일 하단 바, 모달·토스트 자리
import { SITE, RESORTS } from './data.mjs';
import { esc, jsonld } from './lib.mjs';

// 기존 홈페이지 주메뉴 8개를 그대로 옮김(+자주 묻는 질문)
export const NAV = [
  { name: '뽀드득 안내', href: 'about/', sec: ['about', 'location', 'notice', 'faq'], sub: [['소개 및 내부전경', 'about/'], ['오시는 길', 'location/'], ['공지사항', 'notice/'], ['자주 묻는 질문', 'faq/']] },
  { name: '갤러리', href: 'gallery/', sec: ['gallery'], sub: [['의류 갤러리', 'gallery/#의류'], ['장비 갤러리', 'gallery/#장비'], ['장비관리 갤러리', 'gallery/#장비관리'], ['강습 갤러리', 'gallery/#강습']] },
  { name: '요금안내', href: 'rates/lift/', sec: ['rates'], sub: [['리프트 요금', 'rates/lift/'], ['렌탈 요금', 'rates/rental/']] },
  { name: '숙박안내', href: 'stay/tower/', sec: ['stay'], sub: [['타워 콘도', 'stay/tower/'], ['빌라 콘도', 'stay/villa/'], ['그린피아 콘도', 'stay/greenpia/']] },
  { name: '강습안내', href: 'lesson/', sec: ['lesson'], sub: [['강습 요금', 'lesson/'], ['강사진 소개', 'lesson/instructors/'], ['강습 프로그램', 'lesson/program/']] },
  { name: '견적문의', href: 'quote/', sec: ['quote'], sub: [['견적문의', 'quote/']] },
  { name: '예약하기', href: 'reserve/', sec: ['reserve'], sub: [['예약하기', 'reserve/']] },
  { name: '중고장비 직거래장터', href: 'secondhand/', sec: ['secondhand'], sub: [['중고장비 직거래장터', 'secondhand/']] },
];

export const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm12 8v9H5v-9zm-9 2H7v3h3z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 11.8 6.7l4.3 4.3H4v2h12.1l-4.3 4.3 1.4 1.4L20 12z"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>',
  ticket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4m-9 7.5h-2v-2h2zm0-4.5h-2v-2h2zm0-4.5h-2v-2h2z"/></svg>',
  ski: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0M5 21.6l-1-1.7 14.9-8.6 1 1.7-3.1 1.8.7 2.7-1.9.5-.6-2.2-3.8 2.2.4 1.5-1.9.5-.3-1zm4.2-8.3-1.6-1.2 3-4a2 2 0 0 1 2.4-.6l3.5 1.6-.8 1.8-2.8-1.3-1.1 1.5 1.8 1.6-1.4 1.4-1.6-1.4z"/></svg>',
  shirt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1.2 1.6L21 6.8l-1.8 4.6-2.2-.9V21H7V10.5l-2.2.9L3 6.8l4.8-2.2z"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9m0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5"/></svg>',
  pic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 5v14H3V5zm-2 2H5v8.6l3.5-3.6 3 3 4-4.5 3.5 3.9zM8.5 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/></svg>',
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l5 5v15H6zm8 1.5V8h4.5zM8 12v2h8v-2zm0 4v2h8v-2z"/></svg>',
  bed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h2v8h6V7h7a3 3 0 0 1 3 3v9h-2v-3H5v3H3zm5.5 6.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4M14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9zm18.7 6.3-1.4 1.4L17 13.4l-3.3 3.3-1.4-1.4 3.3-3.3-3.3-3.3 1.4-1.4 3.3 3.3 3.3-3.3 1.4 1.4-3.3 3.3z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h11v13h-2V5H8zM4 7h11v14H4z"/></svg>',
  sms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2m3 6v2h2V9zm4 0v2h2V9zm4 0v2h2V9z"/></svg>',
};

function analytics() {
  const a = SITE.analytics;
  let s = '';
  if (a.googleVerify) s += `<meta name="google-site-verification" content="${esc(a.googleVerify)}">`;
  if (a.naverVerify) s += `<meta name="naver-site-verification" content="${esc(a.naverVerify)}">`;
  return s;
}
function tracking(on) {
  if (!on) return '';
  const a = SITE.analytics; let s = '';
  if (a.ga4) s += `<script async src="https://www.googletagmanager.com/gtag/js?id=${a.ga4}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${a.ga4}');</script>`;
  if (a.naver) s += `<script src="https://wcs.naver.net/wcslog.js"></script><script>if(!wcs_add)var wcs_add={};wcs_add.wa="${a.naver}";if(window.wcs)wcs_do();</script>`;
  return s;
}

export function page(meta, u, body) {
  const { title, description, url, schema, section = '', ogImage = 'assets/img/og.jpg', noindex, v, bodyClass = '', keywords = [], track = false, h1 } = meta;
  const og = ogImage.startsWith('http') ? ogImage : SITE.url + ogImage;
  const navHtml = NAV.map(n => `<li class="gnb-item${n.sec.includes(section) ? ' is-on' : ''}"><a href="${u(n.href)}" class="gnb-link"${n.sec.includes(section) ? ' aria-current="page"' : ''}>${esc(n.name)}</a>${n.sub.length > 1 ? `<div class="gnb-sub"><ul>${n.sub.map(([t, h]) => `<li><a href="${u(h)}">${esc(t)}</a></li>`).join('')}</ul></div>` : ''}</li>`).join('');
  const drawer = NAV.map(n => n.sub.length > 1
    ? `<details class="dr-grp"${n.sec.includes(section) ? ' open' : ''}><summary>${esc(n.name)}${ICON.chev}</summary><ul>${n.sub.map(([t, h]) => `<li><a href="${u(h)}">${esc(t)}</a></li>`).join('')}</ul></details>`
    : `<a class="dr-one" href="${u(n.href)}">${esc(n.name)}</a>`).join('');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : ''}
<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e1a2b">
<meta name="format-detection" content="telephone=no">
${analytics()}
<link rel="icon" href="${u('favicon.ico')}" sizes="48x48">
<link rel="icon" type="image/png" href="${u('assets/img/brand/icon-512.png')}">
<link rel="apple-touch-icon" href="${u('assets/img/brand/apple-touch-icon.png')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap">
<link rel="stylesheet" href="${u('assets/css/style.css')}?v=${v}">
${schema ? jsonld(schema) : ''}
${tracking(track)}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">본문 바로가기</a>
<header class="hd" id="hd">
  <div class="hd-in">
    <a class="logo" href="${u('')}" aria-label="${SITE.name} 홈"><img src="${u('assets/img/brand/logo.png')}" alt="${SITE.name}" width="480" height="128"></a>
    <nav class="gnb" aria-label="주메뉴"><ul>${navHtml}</ul></nav>
    <div class="hd-act">
      <a class="hd-tel" href="${SITE.phoneHref}">${ICON.phone}<span>${SITE.phone}</span></a>
      <a class="btn btn-red btn-sm hd-cta" href="${u('reserve/')}">예약하기</a>
      <button class="hd-menu" type="button" data-drawer-open="menu" aria-label="전체 메뉴 열기" aria-controls="drawer-menu">${ICON.menu}</button>
    </div>
  </div>
</header>
<div class="drawer" id="drawer-menu" role="dialog" aria-modal="true" aria-label="전체 메뉴" hidden>
  <div class="drawer-dim" data-drawer-close></div>
  <div class="drawer-panel">
    <div class="drawer-hd"><img src="${u('assets/img/brand/logo.png')}" alt="${SITE.name}" width="160" height="43"><button type="button" class="icon-btn" data-drawer-close aria-label="메뉴 닫기">${ICON.close}</button></div>
    <nav class="drawer-nav" aria-label="전체 메뉴">${drawer}</nav>
    <div class="drawer-ft"><a class="btn btn-line" href="${SITE.phoneHref}">${ICON.phone}${SITE.phone}</a><a class="btn btn-red" href="${u('reserve/')}">${ICON.cal}예약하기</a></div>
  </div>
</div>
<main id="main">
${body}
</main>
<footer class="ft">
  <div class="wrap ft-in">
    <div class="ft-brand"><img src="${u('assets/img/brand/logo.png')}" alt="${SITE.name}" width="180" height="48" loading="lazy"><p>${esc(SITE.tagline)}</p></div>
    <div class="ft-info">
      <p><strong>${SITE.name}</strong> (${SITE.operator}) · 대표 ${SITE.ceo} · 사업자등록번호 ${SITE.bizNo}</p>
      <p>주소 ${SITE.address.full} · 고객센터 <a href="${SITE.phoneHref}">${SITE.phone}</a></p>
      <p class="ft-links"><a href="${u('privacy/')}">개인정보처리방침</a><a href="${u('faq/')}">자주 묻는 질문</a><a href="${u('location/')}">오시는 길</a></p>
      <p class="ft-copy">© ${SITE.name}. All rights reserved.</p>
    </div>
  </div>
</footer>
<nav class="mbar" aria-label="빠른 연락">
  <a href="${SITE.phoneHref}">${ICON.phone}<span>전화</span></a>
  <a href="${u('rates/lift/')}">${ICON.ticket}<span>요금</span></a>
  <a href="${u('quote/')}">${ICON.doc}<span>견적</span></a>
  <a class="is-main" href="${u('reserve/')}">${ICON.cal}<span>예약하기</span></a>
</nav>
<div class="modal" id="lightbox" role="dialog" aria-modal="true" aria-label="사진 크게 보기" hidden>
  <div class="modal-dim" data-modal-close></div>
  <figure class="lb"><button type="button" class="icon-btn lb-close" data-modal-close aria-label="닫기">${ICON.close}</button><div class="lb-img ph"><img alt=""></div><figcaption></figcaption>
    <button type="button" class="lb-nav lb-prev" aria-label="이전 사진">‹</button><button type="button" class="lb-nav lb-next" aria-label="다음 사진">›</button></figure>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.PPD=${JSON.stringify({ endpoint: SITE.leadEndpoint, sms: SITE.sms, phone: SITE.phone, resorts: Object.fromEntries(RESORTS.map(r => [r.id, { name: r.name, g: `${r.grooming} (${r.groomingNote})`, t: r.times.map(t => [t.name, t.opts]) }])) }).replace(/</g, '\\u003c')};</script>
<script src="${u('assets/js/app.js')}?v=${v}" defer></script>
</body>
</html>
`;
}
