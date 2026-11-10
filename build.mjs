// 뽀드득 정적 사이트 빌드
//   node build.mjs                      → dist/ (운영: 검색 노출 허용, 방문 분석 태그 포함)
//   node build.mjs --preview <주소>      → dist/ (미리보기: 모든 페이지 noindex, robots Disallow)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };
// 미리보기(noindex): --preview <주소> 또는 환경변수 SITE_PREVIEW_URL(Railway 에서 도메인 연결 전)
const PREVIEW = opt('--preview') || process.env.SITE_PREVIEW_URL || null;
if (PREVIEW) process.env.SITE_URL = PREVIEW.endsWith('/') ? PREVIEW : PREVIEW + '/';
const OUT = path.resolve(ROOT, opt('--out') || 'dist');

const D = await import('./src/data.mjs');
const { loadPosts } = await import('./tools/blog/lib.mjs');
const { SITE, FAQ, STAY, LIFT, RENTAL, RENTAL_COLS, LESSON_FEE, PROGRAM, RESORTS, ABOUT, BRANCHES, KEYWORDS, NOTICES, USED } = D;
const { makeUrl, pageUrl, won } = await import('./src/lib.mjs');
const S = await import('./src/schema.mjs');
const { page } = await import('./src/layout.mjs');
const P = await import('./src/pages.mjs');

// dist 를 통째로 지우지 않는다: 미리보기 서버가 영상을 내보내는 중이면 윈도우가 파일을 잠가 삭제가 실패한다.
// HTML 등 생성물만 지우고, 자원은 크기·수정시각이 같으면 그대로 둔다.
fs.mkdirSync(OUT, { recursive: true });
const walkAll = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walkAll(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
for (const f of walkAll(OUT)) if (!path.relative(OUT, f).startsWith('assets')) fs.rmSync(f, { force: true });
const copyDir = (src, dst) => { fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src, { withFileTypes: true })) { const s = path.join(src, e.name), d = path.join(dst, e.name); if (e.isDirectory()) { copyDir(s, d); continue; } const a = fs.statSync(s); if (fs.existsSync(d)) { const b = fs.statSync(d); if (a.size === b.size && b.mtimeMs >= a.mtimeMs) continue; } fs.copyFileSync(s, d); } };
// 원본에서 사라진 자원은 dist 에서도 지운다
for (const f of walkAll(path.join(OUT, 'assets'))) if (!fs.existsSync(path.join(ROOT, path.relative(OUT, f)))) fs.rmSync(f, { force: true });
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
fs.copyFileSync(path.join(ROOT, 'favicon.ico'), path.join(OUT, 'favicon.ico'));
const V = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, 'assets/css/style.css'))).update(fs.readFileSync(path.join(ROOT, 'assets/js/app.js'))).digest('hex').slice(0, 8);

const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const pages = [];
const nowKST = (() => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` }; })();
const POSTS = loadPosts(path.join(ROOT, 'content/blog'), { R: '../../', now: process.env.BLOG_ALL === '1' ? null : nowKST });
// 메인 키워드(2026-11-10 지정): 용평렌탈샵 · 용평리조트렌탈샵 · 용평스키장렌탈샵 · 알펜시아렌탈샵 · 용평스키장 렌탈
const MAIN_KW = ['용평렌탈샵', '용평리조트렌탈샵', '용평스키장렌탈샵', '알펜시아렌탈샵', '용평스키장 렌탈'];
const CORE = [...MAIN_KW, '뽀드득', '용평 리프트권 할인', '용평 스키 강습'];
const bc = items => S.breadcrumb(items.map(([name, rel]) => ({ name, url: SITE.url + rel })));
const faqOf = key => FAQ.filter(f => f.pages.includes(key));

function emit({ out, title, description, body, section = '', pri = '0.7', type, crumbs, faq = [], extra = [], keywords = [], bodyClass = '', lastmod = '' }) {
  const url = pageUrl(out);
  const schema = S.graph(S.business(), S.website(), S.webpage({ url, title, description, type }), crumbs ? bc(crumbs) : null, S.faqPage(faq, url), ...extra);
  write(out, page({ title, description, url, schema, section, noindex: !!PREVIEW, v: V, bodyClass, track: !PREVIEW, keywords: [...new Set([...keywords, ...CORE])] }, makeUrl(out), body(makeUrl(out))));
  pages.push({ out, pri, lastmod });
}

// ── 홈 ──
emit({ out: 'index.html', pri: '1.0', bodyClass: 'home',
  title: '용평렌탈샵 뽀드득 | 용평리조트·용평스키장 렌탈샵, 알펜시아렌탈샵',
  description: `용평리조트·알펜시아 5분, 용평스키장 렌탈샵 뽀드득. 스키·보드 장비 렌탈 ${won(15000)}부터, 스키복 렌탈, 리프트권 할인 예약(용평 1타임 대인 ${won(34000)}), 1:1·2:1 스키 강습까지 한 곳에서. ☎ ${SITE.phone}`,
  keywords: [...MAIN_KW, '모나 용평 렌탈', '용평 스키복 렌탈'], faq: faqOf('home'),
  body: u => P.home(u, POSTS) });

// ── 블로그(예약 공개: date·time 이 지금(KST)보다 늦은 글은 아직 빌드하지 않는다) ──
for (const p of POSTS) {
  const rel = POSTS.filter(x => x !== p && x.category === p.category).slice(0, 3);
  const url = SITE.url + `blog/${p.slug}/`, img = SITE.url + 'assets/img/og-logo.jpg';
  emit({ out: `blog/${p.slug}/index.html`, section: 'blog', pri: '0.6', type: 'WebPage', crumbs: [['홈', ''], ['블로그', 'blog/'], [p.title, `blog/${p.slug}/`]], faq: p.faq,
    title: `${p.title} | 뽀드득`, description: p.description, keywords: [p.keyword, ...(p.tags || [])].filter(Boolean), lastmod: p.date,
    extra: [{ '@type': 'BlogPosting', '@id': url + '#post', headline: p.title, description: p.description, datePublished: `${p.date}T${p.time || '09:00'}:00+09:00`, dateModified: `${p.updated || p.date}T${p.time || '09:00'}:00+09:00`,
      author: { '@type': 'Organization', name: p.author || D.BLOG.author, url: SITE.url }, publisher: { '@id': SITE.url + '#business' }, mainEntityOfPage: url, image: img, keywords: [p.keyword, ...(p.tags || [])].filter(Boolean).join(', '), articleSection: p.category, inLanguage: 'ko-KR', wordCount: p.chars }],
    body: u => P.blogPost(u, p, rel.length ? rel : POSTS.filter(x => x !== p).slice(0, 3)) });
}
emit({ out: 'blog/index.html', section: 'blog', pri: '0.7', type: 'CollectionPage', crumbs: [['홈', ''], ['블로그', 'blog/']],
  title: '뽀드득 블로그 — 용평 스키 렌탈·리프트권·강습 가이드', description: D.BLOG.lead,
  extra: [{ '@type': 'Blog', '@id': SITE.url + 'blog/#blog', name: D.BLOG.name, url: SITE.url + 'blog/', publisher: { '@id': SITE.url + '#business' }, blogPost: POSTS.slice(0, 20).map(p => ({ '@id': SITE.url + `blog/${p.slug}/#post` })) }],
  body: u => P.blogIndex(u, POSTS) });

// ── 뽀드득 안내 ──
emit({ out: 'about/index.html', section: 'about', type: 'AboutPage', crumbs: [['홈', ''], ['소개 및 내부전경', 'about/']], faq: faqOf('about'),
  title: '뽀드득 소개 및 내부전경 — 용평렌탈샵·스키 강습 (구 겨울바라기)', description: `뽀드득은 프리미엄 스키·보드 렌탈과 전문 강습을 함께 운영합니다. ${SITE.near}. 렌탈샵 ${BRANCHES.rental.join('·')}, 강습센터 ${BRANCHES.lesson[0]}. 매장 내부 사진.`,
  body: u => P.about(u) });
emit({ out: 'location/index.html', section: 'location', crumbs: [['홈', ''], ['오시는 길', 'location/']], faq: faqOf('location'),
  title: '용평렌탈샵 뽀드득 오시는 길 — 평창 대관령면 올림픽로 238 (용평·알펜시아 5분)', description: `${SITE.address.full}(지번 ${SITE.address.old}). ${SITE.near}. 대표전화 ${SITE.phone}. 카카오맵·네이버 지도 바로가기.`,
  body: u => P.location(u) });
emit({ out: 'notice/index.html', section: 'notice', pri: '0.4', crumbs: [['홈', ''], ['공지사항', 'notice/']],
  title: '공지사항 | 뽀드득', description: '뽀드득 스키 렌탈·강습 공지사항입니다.',
  extra: NOTICES.map(n => ({ '@type': 'NewsArticle', headline: n.title, datePublished: n.date, articleBody: n.body.join(' '), url: SITE.url + 'notice/#' + n.id, publisher: { '@id': SITE.url + '#business' } })),
  body: u => P.notice(u) });
emit({ out: 'faq/index.html', section: 'faq', pri: '0.8', crumbs: [['홈', ''], ['자주 묻는 질문', 'faq/']], faq: FAQ,
  title: '용평 스키 렌탈·리프트권·강습 자주 묻는 질문 | 뽀드득', description: '용평·알펜시아 리프트권 할인율, 1·2·3타임과 정설시간, 장비·스키복 렌탈 요금, 강습 인원·시간, 예약 방법을 뽀드득 기준으로 답합니다.',
  body: u => P.faqPage(u) });

// ── 갤러리·중고장터 ──
emit({ out: 'gallery/index.html', section: 'gallery', pri: '0.5', type: 'CollectionPage', crumbs: [['홈', ''], ['갤러리', 'gallery/']],
  title: '갤러리 — 스키복·장비·매장 사진 | 뽀드득', description: '뽀드득 매장의 스키 장비 진열대, 스키복 의류 코너, 헬멧·고글, 새로 입고된 장비 사진을 모았습니다.',
  body: u => P.gallery(u) });
emit({ out: 'secondhand/index.html', section: 'secondhand', pri: '0.4', crumbs: [['홈', ''], ['중고장비 직거래장터', 'secondhand/']],
  title: '중고 스키 장비 직거래장터 | 뽀드득', description: `뽀드득에서 사용한 스키 장비를 직거래로 판매합니다. ${USED.map(x => `${x.title}(${x.qty}대)`).join(', ')}. 판매 여부는 ${SITE.phone}로 확인하세요.`,
  extra: USED.map(x => ({ '@type': 'Product', name: x.title, description: x.body, image: SITE.url + 'assets/img/' + x.img, offers: { '@type': 'Offer', price: x.price, priceCurrency: 'KRW', itemCondition: 'https://schema.org/UsedCondition', seller: { '@id': SITE.url + '#business' } } })),
  body: u => P.secondhand(u) });

// ── 요금 ──
emit({ out: 'rates/lift/index.html', section: 'rates', pri: '0.9', crumbs: [['홈', ''], ['요금안내', 'rates/lift/'], ['리프트 요금', 'rates/lift/']], faq: faqOf('lift'),
  title: `용평·알펜시아 리프트권 할인 ${SITE.season} 요금표 | 뽀드득`, description: `용평리조트 1타임 대인 ${won(68000)} → 뽀드득 예약가 ${won(34000)}, 2타임 ${won(96000)} → ${won(48000)}. 사전 예약 시 약 40%(알펜시아 45%) 할인, 이용 1일 전까지 전화 예약 필수.`,
  keywords: ['용평 리프트권 할인', '알펜시아 리프트권 할인', '용평 리프트권 가격', '모나 용평 리프트권'],
  body: u => P.lift(u) });
emit({ out: 'rates/rental/index.html', section: 'rates', pri: '0.9', crumbs: [['홈', ''], ['요금안내', 'rates/lift/'], ['렌탈 요금', 'rates/rental/']], faq: faqOf('rental'),
  title: `용평스키장 렌탈 요금 ${SITE.season} — 장비·스키복·보호장비 | 용평렌탈샵 뽀드득`, description: `프리미엄 초급자 스키·보드 1타임 예약가 ${won(15000)}, 중급자 ${won(25000)}, 하이엔드 ${won(40000)}~. 스키복 ${won(20000)}~(어반그레이 등 하이엔드 ${won(30000)}), 헬멧·고글·보호대 ${won(5000)}.`,
  keywords: ['용평스키장 렌탈 가격', '용평리조트 렌탈 요금', '알펜시아 렌탈 요금', '용평 스키복 렌탈', '어반그레이 렌탈', '용평 보드 렌탈'],
  body: u => P.rental(u) });

// ── 숙박 ──
for (const s of STAY) {
  const rooms = s.types.flatMap(t => t.rooms.map(r => r[1]));
  emit({ out: `stay/${s.slug}/index.html`, section: 'stay', pri: '0.5', crumbs: [['홈', ''], ['숙박안내', 'stay/tower/'], [s.name, `stay/${s.slug}/`]],
    title: `용평리조트 ${s.name} 객실 안내 — ${s.types.map(t => t.label).join('·')} | 뽀드득`, description: `${s.lead} 객실 타입 ${rooms.join(', ')}. 객실 사진·구성·투숙인원·비품 안내. 숙박 문의 ${SITE.phone}.`,
    body: u => P.stay(u, s) });
}

// ── 강습 ──
emit({ out: 'lesson/index.html', section: 'lesson', pri: '0.9', crumbs: [['홈', ''], ['강습안내', 'lesson/'], ['강습 요금', 'lesson/']], faq: faqOf('lesson'),
  title: '용평 스키·보드 강습 요금 — 1:1 20만원부터 | 뽀드득', description: `1:1 강습 2시간 20만원·3시간 25만원·4시간 30만원, 2:1 강습 25·30·35만원. 스키와 보드 동일, 1:1·2:1만 운영(3명 이상·1시간 강습 없음).`,
  keywords: ['용평 스키 강습', '알펜시아 스키 강습', '스키 개인 강습 가격', '보드 강습 가격'],
  extra: [{ '@type': 'Service', name: '뽀드득 스키·보드 강습', provider: { '@id': SITE.url + '#business' }, areaServed: '평창 용평·알펜시아', offers: LESSON_FEE.rows.flatMap(r => LESSON_FEE.hours.map((h, i) => ({ '@type': 'Offer', name: `${r.name} ${h}시간`, price: r.p[i], priceCurrency: 'KRW' }))) }],
  body: u => P.lessonFee(u) });
emit({ out: 'lesson/program/index.html', section: 'lesson', pri: '0.7', crumbs: [['홈', ''], ['강습안내', 'lesson/'], ['강습 프로그램', 'lesson/program/']], faq: faqOf('lesson'),
  title: '스키 강습 프로그램 — 처음·초급·중급·상급 단계별 내용 | 뽀드득', description: '처음단계(안전수칙·장비·푸르그 화렌)부터 초급(프루그 보겐·턴), 중급(슈템턴·패러럴), 상급(카빙 롱턴·숏턴)까지 단계별 실기능력과 강습내용·학습목표.',
  extra: [{ '@type': 'Course', name: '뽀드득 스키 강습 프로그램', description: PROGRAM.map(p => `${p.name}: ${p.lead}`).join(' '), provider: { '@id': SITE.url + '#business' }, hasCourseInstance: PROGRAM.map(p => ({ '@type': 'CourseInstance', name: p.name, courseMode: 'onsite', description: p.lead })) }],
  body: u => P.program(u) });
emit({ out: 'lesson/instructors/index.html', section: 'lesson', pri: '0.4', crumbs: [['홈', ''], ['강습안내', 'lesson/'], ['강사진 소개', 'lesson/instructors/']],
  title: '강사진 소개 | 뽀드득 스키·보드 강습', description: '공식 자격을 보유한 뽀드득 강사진이 초급부터 상급까지 수준별 맞춤 강습으로 안전하고 즐거운 스키를 돕습니다.',
  body: u => P.instructors(u) });

// ── 견적·예약 ──
emit({ out: 'reserve/index.html', section: 'reserve', pri: '0.8', crumbs: [['홈', ''], ['예약하기', 'reserve/']], faq: faqOf('reserve'),
  title: '예약하기 — 용평·알펜시아 렌탈·리프트권·강습 | 뽀드득', description: '이용날짜·스키장·이용타임을 고르고 스키·보드 장비, 의류, 강습을 함께 예약하세요. 리프트권 할인은 이용 1일 전까지 예약.',
  body: u => P.book(u, 'reserve') });
emit({ out: 'quote/index.html', section: 'quote', pri: '0.7', crumbs: [['홈', ''], ['견적문의', 'quote/']], faq: faqOf('reserve'),
  title: '견적문의 — 스키 렌탈·강습·리프트권 한 번에 | 뽀드득', description: '가족·단체 렌탈, 리프트권, 강습 견적을 한 번에 받아 보세요. 날짜·스키장·필요한 장비만 알려 주시면 안내드립니다.',
  body: u => P.book(u, 'quote') });
emit({ out: 'privacy/index.html', pri: '0.1', crumbs: [['홈', ''], ['개인정보처리방침', 'privacy/']],
  title: '개인정보처리방침 | 뽀드득', description: '뽀드득 홈페이지 견적·예약 접수의 개인정보 수집·이용 안내입니다.', body: u => P.privacy(u) });

// ── 404 (어느 경로에서나 열리므로 절대 주소) ──
{
  const abs = to => /^(https?:|tel:|mailto:|sms:|#)/.test(to) ? to : SITE.url + to.replace(/^\//, '');
  write('404.html', page({ title: '페이지를 찾을 수 없습니다 | 뽀드득', description: '요청한 페이지가 없습니다.', url: SITE.url + '404.html', schema: S.graph(S.website()), v: V, noindex: true }, abs, P.notFound(abs)));
}

// ── sitemap · robots · llms ──
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `<url><loc>${pageUrl(p.out)}</loc><lastmod>${p.lastmod || SITE.asof}</lastmod><priority>${p.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', PREVIEW ? 'User-agent: *\nDisallow: /\n'
  : ['# 검색엔진과 AI 검색·답변 엔진의 수집을 모두 허용합니다', 'User-agent: *', 'Allow: /', '',
    ...['Googlebot', 'Bingbot', 'Yeti', 'Daumoa', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended'].flatMap(b => [`User-agent: ${b}`, 'Allow: /', '']),
    `Sitemap: ${SITE.url}sitemap.xml`, ''].join('\n'));

const liftLines = LIFT.map(l => `### ${l.title}\n- ${l.note}\n${l.rows.map(r => `- ${r.time}(${r.detail.join(', ')}): 대인 정상가 ${won(r.adult[0][0])} → 뽀드득 ${won(r.adult[0][1])}, 소인 ${won(r.child[0][0])} → ${won(r.child[0][1])}`).join('\n')}`).join('\n\n');
const rentalLines = RENTAL.map(g => `### ${g.group}\n${g.items.map(it => `- ${it.name}${it.sub ? `(${it.sub})` : ''}: ${RENTAL_COLS.map((c, i) => { const v = it.p[i]; return g.flat ? `${c} ${v ? won(v) : '문의'}` : `${c} ${v[1] ? `${won(v[1])}(정상가 ${won(v[0])})` : '문의'}`; }).join(' / ')}`).join('\n')}`).join('\n\n');
const llms = `# ${SITE.name} (${SITE.nameEn}) — 용평·알펜시아 스키 렌탈·강습

> 뽀드득은 ${SITE.address.full}에 있는 스키·스노보드 렌탈과 강습 전문점이다. ${SITE.near}. 리프트권 할인 예약, 장비·스키복 렌탈, 1:1·2:1 스키·보드 강습을 운영한다. 이전 이름은 겨울바라기(겨울바라기 AC)이며 25/26 시즌 뽀드득으로 단장했다.

## 핵심 사실 (${SITE.season}, ${SITE.asof} 기준)
- 상호: ${SITE.name} / 운영: ${SITE.operator} / 대표 ${SITE.ceo} / 사업자등록번호 ${SITE.bizNo}
- 주소: ${SITE.address.full} (지번 ${SITE.address.old})
- 대표전화: ${SITE.phone}
- 영업시간: ${SITE.hours}
- 렌탈샵: ${BRANCHES.rental.join(', ')} / 강습센터: ${BRANCHES.lesson.join(', ')}
- 리프트권 할인은 이용 1일 전까지 전화 예약 필수
- 강습: 1:1·2:1만 운영(3명 이상 불가), 2·3·4시간(1시간 없음), 스키와 보드 요금 같음
- 공식 홈페이지: ${SITE.url}

## 리프트권
${liftLines}

## 스키장별 이용타임(예약 기준)
${RESORTS.map(r => `- ${r.name}: ${r.times.map(t => `${t.name} ${t.opts.map(([n, h]) => `${n} ${h}`).join(' 또는 ')}`).join(' / ')} / 정설시간 ${r.grooming}(${r.groomingNote})`).join('\n')}

## 렌탈 요금 (용평리조트, 예약 할인가)
${rentalLines}

## 강습 요금
${LESSON_FEE.rows.map(r => `- ${r.name}: ${LESSON_FEE.hours.map((h, i) => `${h}시간 ${won(r.p[i])}`).join(', ')}`).join('\n')}

## 강습 프로그램
${PROGRAM.map(p => `- ${p.name}: ${p.lead}`).join('\n')}

## 숙박 안내(용평리조트 콘도)
${STAY.map(s => `- ${s.name}: ${s.types.flatMap(t => t.rooms.map(r => `${r[1]} ${r[2]} ${r[3]} ${r[4] === '문의' ? '' : r[4]}`.trim())).join('; ')}`).join('\n')}

## 이런 질문에 답하는 페이지
${KEYWORDS.map(([k, h]) => `- ${k}: ${SITE.url}${h}`).join('\n')}

## 주요 페이지
- [홈](${SITE.url}) · [리프트 요금](${SITE.url}rates/lift/) · [렌탈 요금](${SITE.url}rates/rental/) · [강습 요금](${SITE.url}lesson/) · [강습 프로그램](${SITE.url}lesson/program/) · [예약하기](${SITE.url}reserve/) · [견적문의](${SITE.url}quote/) · [오시는 길](${SITE.url}location/) · [자주 묻는 질문](${SITE.url}faq/)

## 자주 묻는 질문
${FAQ.map(f => `### ${f.q}\n${f.a}`).join('\n\n')}
`;
write('llms.txt', llms + (POSTS.length ? `\n## 블로그(최근 글)\n${POSTS.slice(0, 30).map(p => `- [${p.title}](${SITE.url}blog/${p.slug}/): ${p.description}`).join('\n')}\n` : ''));
// RSS(네이버 서치어드바이저 제출용)
const xe = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${xe(D.BLOG.name)}</title><link>${SITE.url}blog/</link><description>${xe(D.BLOG.lead)}</description><language>ko</language>\n${POSTS.slice(0, 50).map(p => `<item><title>${xe(p.title)}</title><link>${SITE.url}blog/${p.slug}/</link><guid>${SITE.url}blog/${p.slug}/</guid><description>${xe(p.description)}</description><category>${xe(p.category)}</category><pubDate>${new Date(`${p.date}T${p.time || '09:00'}:00+09:00`).toUTCString()}</pubDate></item>`).join('\n')}\n</channel></rss>\n`);
if (!PREVIEW && opt('--cname')) write('CNAME', opt('--cname') + '\n');

// ── 미리보기(GitHub Pages)용 데모 어드민: 서버가 없으니 화면만 시험용 데이터로 둘러보게(demo / demo). 실제 서버(Railway)의 /admin 은 tools/admin 이 직접 내줌 ──
if (PREVIEW) {
  const A = path.join(ROOT, 'tools/admin/public'), AD = path.join(OUT, 'admin');
  fs.mkdirSync(AD, { recursive: true });
  for (const f of ['admin.css', 'admin.js', 'demo-api.js']) fs.copyFileSync(path.join(A, f), path.join(AD, f));
  write('admin/index.html', fs.readFileSync(path.join(A, 'index.html'), 'utf8').replace('href="/favicon.ico"', 'href="../favicon.ico"').replace('href="/admin/admin.css"', 'href="admin.css"')
    .replace('<script src="/admin/admin.js"></script>', '<script src="demo-api.js"></script>\n<script src="admin.js"></script>').replace('<title>뽀드득 관리자</title>', '<title>뽀드득 관리자 (미리보기 데모)</title>'));
  const all = loadPosts(path.join(ROOT, 'content/blog'), { R: '../../' });
  let topics = []; try { topics = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/blog/_topics.json'), 'utf8')); } catch { /* 없음 */ }
  write('admin/demo-data.json', JSON.stringify({ defaults: D.DEFAULTS, galleryCats: D.GALLERY_CATS, faqPages: D.FAQ_PAGES,
    posts: all.map(p => ({ slug: p.slug, title: p.title, date: p.date, time: p.time || '', category: p.category, keyword: p.keyword, chars: p.chars })),
    todo: topics.filter(t => t.status === 'todo').map(t => ({ id: t.id, title: t.title, keywords: t.keywords, category: t.category })),
    commits: [{ sha: 'demo', message: '어드민: 요금 수정', author: 'Kevin(세느루)', date: new Date(Date.now() - 864e5).toISOString() }, { sha: 'demo', message: '블로그: AI 글 자동 발행', author: 'ppoddeudeuk-blog-bot', date: new Date().toISOString() }] }));
}

// ── 검증: 내부 링크·자원, JSON-LD, 페이지당 H1 1개 ──
let broken = 0, ld = 0, h1bad = 0;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(OUT).filter(f => f.endsWith('.html') && !path.relative(OUT, f).startsWith('admin'))) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(OUT, f);
  if (!f.endsWith('404.html')) {
    for (const m of html.matchAll(/(?:href|src|poster|data-lb|data-src(?:-xl|-m)?|data-poster-m)="([^"]+)"/g)) {
      let h = m[1];
      if (/^(https?:|\/\/|tel:|mailto:|sms:|#|data:)/.test(h)) continue;
      h = h.split('#')[0].split('?')[0];
      if (!h) continue;
      let t = path.resolve(path.dirname(f), decodeURIComponent(h));
      if (h.endsWith('/') || h === '.' || h === './' || /\.\.$/.test(h)) t = path.join(t, 'index.html');
      if (!fs.existsSync(t)) { broken++; if (broken < 25) console.warn(`깨진 참조: ${rel} → ${m[1]}`); }
    }
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) { h1bad++; console.warn(`H1 ${h1}개: ${rel}`); }
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { JSON.parse(m[1]); ld++; }
}
console.log(`빌드 완료 → ${path.relative(ROOT, OUT) || '.'}${PREVIEW ? ' (미리보기 noindex)' : ''} · 페이지 ${pages.length} · JSON-LD ${ld} · 깨진 참조 ${broken} · H1 이상 ${h1bad}`);
if (broken || h1bad) process.exitCode = 1;
