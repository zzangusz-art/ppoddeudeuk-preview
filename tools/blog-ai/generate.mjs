// 뽀드득 블로그 — AI 글 자동 작성기 (GitHub Actions 가 매일 09·13·18시에 실행 → 하루 3편). 미래애드원·퀵서비스다 생성기와 같은 구조
// 사용:
//   node tools/blog-ai/generate.mjs              다음 주제 1편 작성 → 검증 통과 시 content/blog/<slug>.md 로 발행
//   node tools/blog-ai/generate.mjs --count 3    연속 3편(수동 보충용)
//   node tools/blog-ai/generate.mjs --topic id   특정 주제
//   node tools/blog-ai/generate.mjs --cap 3      오늘(KST) 글이 예약 글 포함 3편 이상이면 쓰지 않음(예약 글과 자동 작성이 겹치지 않게)
//   node tools/blog-ai/generate.mjs --check      API 호출 없이 기존 글 전체를 같은 검증기로 검사(빌드 때 실행)
//   node tools/blog-ai/generate.mjs --check-file <파일>  글 한 편만 검사(사람이 미리 쓸 때)
//   node tools/blog-ai/generate.mjs --plan       다음에 쓸 주제 10개 미리보기(API 호출 없음)
//   node tools/blog-ai/generate.mjs --sheet      사실 목록·허용 수치 출력(사람이 미리 쓸 때 기준)
// 주제: content/blog/_topics.json 의 status:"todo" 를 먼저 쓰고(메인 키워드 우선), 다 쓰면 키워드×관점 조합으로 자동 생성한다.
// 검증에 실패한 글은 발행하지 않고 content/drafts/ 에 남긴다(사람이 고쳐서 content/blog/ 로 옮기면 발행).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, loadPosts } from '../blog/lib.mjs';
import * as D from '../../src/data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG = path.join(ROOT, 'content/blog');
const DRAFTS = path.join(ROOT, 'content/drafts');
const TOPICS = path.join(BLOG, '_topics.json');
const MODEL = process.env.BLOG_MODEL || 'claude-opus-5-5';
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };
const won = n => n.toLocaleString('ko-KR') + '원';
const man = n => n % 10000 === 0 ? `${(n / 10000).toLocaleString('ko-KR')}만원` : won(n);

// ── 사실 목록: 사이트 데이터(src/data.mjs, 어드민에서 고친 요금 포함)에서만 만든다. 순서를 고정해 프롬프트 캐시가 유지되게 한다
function factSheet() {
  const { SITE: S, BRANCHES, LIFT, RENTAL, RENTAL_COLS, LESSON_FEE, PROGRAM, RESORTS, STAY, INSTRUCTORS } = D;
  const L = [];
  L.push(`[업체] ${S.name}(${S.nameEn}, 이전 이름 겨울바라기·겨울바라기 AC). 대표 ${S.ceo}. 스키·스노보드 렌탈과 강습 전문점. 주소 ${S.address.full}(지번 ${S.address.old}). ${S.near}. 대표전화 ${S.phone}. 영업시간 ${S.hours}.`);
  L.push(`[지점] 렌탈샵 ${BRANCHES.rental.join(', ')} / 강습센터 ${BRANCHES.lesson.join(', ')}(기존 홈페이지 안내 기준).`);
  L.push('[서비스] 리프트권 할인 예약 대행, 스키·보드 장비 렌탈, 스키복(의류) 렌탈, 헬멧·고글·보호대 렌탈, 1:1·2:1 스키·보드 강습, 용평리조트 콘도(타워·빌라·그린피아) 숙박 안내. 고객의 목적과 실력에 맞춰 장비를 추천하고, 매 시즌 장비 컨디션을 점검한다.');
  for (const l of LIFT) L.push(`[리프트권 ${l.resort}, ${S.season}] ${l.note} ${l.rows.map(r => `${r.time}(${r.detail.join(', ')}): 대인 정상가 ${won(r.adult[0][0])} → 뽀드득 ${won(r.adult[0][1])}, 소인 ${won(r.child[0][0])} → ${won(r.child[0][1])}`).join(' / ')}${l.extra ? ` (${l.extra})` : ''}.`);
  for (const r of RESORTS) L.push(`[이용타임 ${r.name}] ${r.times.map(t => `${t.name}: ${t.opts.map(([n, h]) => `${n} ${h}`).join(' 또는 ')}`).join(' / ')}. 정설시간 ${r.grooming}(${r.groomingNote}).`);
  for (const g of RENTAL) L.push(`[렌탈 ${g.group}, 용평리조트 ${S.season}, 1·2·3타임 = ${RENTAL_COLS.join(' / ')}] ${g.items.map(it => `${it.name}${it.sub ? `(${it.sub})` : ''}: ${it.p.map((v, i) => g.flat ? `${i + 1}타임 ${v ? won(v) : '문의'}` : `${i + 1}타임 ${v[1] ? `예약가 ${won(v[1])}(정상가 ${won(v[0])})` : '문의'}`).join(', ')}`).join(' / ')}.`);
  L.push(`[강습 요금] ${LESSON_FEE.rows.map(r => `${r.name} ${LESSON_FEE.hours.map((h, i) => `${h}시간 ${man(r.p[i])}`).join(', ')}`).join(' / ')}. ${LESSON_FEE.rules.join(' ')}`);
  for (const p of PROGRAM) L.push(`[강습 프로그램 ${p.name}] ${p.lead} 배우는 내용: ${[...new Set(p.rows.flatMap(r => r.learn || []))].join(', ')}.`);
  L.push(`[강사진] ${INSTRUCTORS.map(t => [t.name, t.cred].filter(Boolean).join(' ')).join(', ')}. 강사 개인의 경력·실적은 사실 목록에 없으면 쓰지 않는다.`);
  for (const s of STAY) L.push(`[숙박 ${s.name}(용평리조트)] ${s.lead} 객실: ${s.types.flatMap(t => t.rooms.map(r => `${r[1]}(${r[3]}, 투숙 ${r[4]})`)).join(', ')}. 비품: ${s.amenity.appliance}.`);
  L.push('[예약 방법] 홈페이지 예약하기·견적문의(/reserve/, /quote/)에서 날짜·스키장·이용타임·장비·강습을 고르거나 전화. 리프트권 할인은 이용 1일 전까지 전화 예약 필수. 접수 후 문자 또는 전화로 확인 연락.');
  return L.join('\n');
}
function allowedNumbers(sheet) {
  const set = new Set(['1', '2', '3', '4', '5', '6', '10', '2025', '2026', '25', '26']);
  for (const m of sheet.matchAll(/\d[\d,]*(?:\.\d+)?/g)) set.add(m[0].replace(/,/g, ''));
  // '만원' 표기: 200000 → 20
  for (const n of [...set]) if (+n >= 10000 && +n % 10000 === 0) set.add(String(+n / 10000));
  for (const r of D.LESSON_FEE.rows) for (const p of r.p) { set.add(String(p)); set.add(String(p / 10000)); }
  return set;
}

// ── 주제: 대기열(_topics.json) → 없으면 키워드×관점 조합
const AUTO_KEYWORDS = [
  ['용평렌탈샵', '렌탈 가이드'], ['용평리조트렌탈샵', '렌탈 가이드'], ['용평스키장렌탈샵', '렌탈 가이드'], ['알펜시아렌탈샵', '렌탈 가이드'], ['용평스키장 렌탈', '렌탈 가이드'],
  ['용평 스키복 렌탈', '렌탈 가이드'], ['용평 보드 렌탈', '렌탈 가이드'], ['용평 리프트권 할인', '리프트권·요금'], ['알펜시아 리프트권', '리프트권·요금'],
  ['용평 스키 강습', '스키 강습'], ['알펜시아 스키 강습', '스키 강습'], ['용평 스키장', '스키장 이용 팁'], ['알펜시아 스키장', '스키장 이용 팁'], ['용평리조트 콘도', '숙박·여행'],
];
const ANGLES = [
  { id: 'first', t: '처음 가는 사람을 위한 준비 순서' }, { id: 'family', t: '가족·아이와 함께 갈 때' }, { id: 'group', t: '친구·단체로 갈 때' },
  { id: 'cost', t: '비용을 미리 계산하는 방법' }, { id: 'mistake', t: '자주 하는 실수와 피하는 방법' }, { id: 'night', t: '야간·오후 시간대에 탈 때' },
];
function autoTopic(used) {
  for (let k = 0; k < AUTO_KEYWORDS.length * ANGLES.length; k++) {
    const [kw, cat] = AUTO_KEYWORDS[k % AUTO_KEYWORDS.length], a = ANGLES[Math.floor(k / AUTO_KEYWORDS.length) % ANGLES.length];
    const id = `auto-${k % AUTO_KEYWORDS.length}-${a.id}`;
    if (used.has(id)) continue;
    return { id, title: `${kw} — ${a.t}`, angle: `「${kw}」를 검색한 사람이 ${a.t}에 궁금해하는 것을 구체적으로 다룬다.`, keywords: [`${kw} ${a.t.split(' ')[0]}`, kw], category: cat, status: 'todo', auto: true };
  }
  return null;
}
function nextTopic(topics, posts) {
  const used = new Set([...topics.map(t => t.id), ...posts.map(p => p.topic).filter(Boolean)]);
  const queued = topics.find(t => t.status === 'todo');
  if (queued) return queued;
  const t = autoTopic(used);
  if (t) topics.push(t);
  return t;
}

// ── 검증
const BANNED = [
  [/최고의|최상의|업계 ?1위|국내 ?1위|지역 ?1위|용평 ?1위|유일한|유일하게|단연|압도적|완벽한|혁신적인|놀라운|최저가|가장 저렴|가장 싼/, '최상급·과장 표현'],
  [/알아보겠습니다|살펴보겠습니다|알아볼까요|살펴볼까요|결론적으로|요약하자면|정리하자면|꿀팁|마무리하며|도움이 되셨기를|이 글에서는|오늘은 .{0,20}(?:알아|살펴)/, '상투 표현'],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, '이모지'],
  [/무조건|반드시 (?:할인|안전)|100%\s*(?:안전|만족|보장)|부상(?:을)? ?(?:막아|예방해) ?드립니다|절대 다치지/, '보장·단정 표현'],
];
const NAMES = [];   // 다른 렌탈샵 상호(알게 되면 추가)
const OK_LINK = /ppoddeudeuk\.co\.kr|yongpyong\.co\.kr|alpensiaresort\.co\.kr/;
const PATHS = ['/', '/rates/lift/', '/rates/rental/', '/lesson/', '/lesson/program/', '/lesson/instructors/', '/reserve/', '/quote/', '/location/', '/faq/', '/about/', '/gallery/', '/stay/tower/', '/stay/villa/', '/stay/greenpia/', '/blog/'];
const bigrams = s => { const t = s.replace(/\s+/g, ''); const set = new Set(); for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2)); return set; };
const sim = (a, b) => { const A = bigrams(a), B = bigrams(b); let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.max(1, Math.min(A.size, B.size)); };
const kwNorm = k => String(k || '').split(/[,，]/).map(x => x.replace(/[\s·]/g, '').toLowerCase()).filter(Boolean);

export function validate(md, { allowed, slugs, titles = [], keywords = new Map(), when = new Map() }) {
  const errs = [];
  let meta, body;
  try { ({ meta, body } = parseFrontmatter(md)); } catch (e) { return { ok: false, errs: ['머리말 형식 오류: ' + e.message] }; }
  for (const k of ['title', 'description', 'slug', 'category', 'tags', 'cover', 'keyword']) if (!meta[k] || (Array.isArray(meta[k]) && !meta[k].length)) errs.push(`머리말 ${k} 누락`);
  for (const k of kwNorm(meta.keyword)) if (keywords.has(k)) errs.push(`1순위 검색어가 다른 글과 겹침: ${k} ↔ ${keywords.get(k)}`);
  if (meta.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) errs.push('slug는 영문 소문자·숫자·하이픈만');
  if (meta.slug && slugs.has(meta.slug)) errs.push(`이미 있는 slug: ${meta.slug}`);
  if (meta.category && !D.BLOG.categories.includes(meta.category)) errs.push(`category는 ${D.BLOG.categories.join('/')} 중 하나`);
  if (meta.title && ([...meta.title].length < 12 || [...meta.title].length > 40)) errs.push('제목은 12~40자');
  if (meta.keyword && meta.title && !meta.title.replace(/\s/g, '').includes(String(meta.keyword).split(',')[0].replace(/\s/g, ''))) errs.push('제목에 1순위 검색어가 없음');
  if (meta.cover && [...meta.cover].length > 28) errs.push('cover는 28자 이내');
  if (meta.description && ([...meta.description].length < 40 || [...meta.description].length > 80)) errs.push('설명은 40~80자');
  for (const t of titles) if (meta.title && sim(meta.title, t) > .72) { errs.push(`기존 글과 제목이 비슷함: ${t}`); break; }
  const len = (body || '').replace(/\s+/g, '').length;
  if (len < 1200 || len > 4800) errs.push(`본문 길이 ${len}자(공백 제외) — 1,200~4,800자`);
  if (!/\n##\s+자주 묻는 질문/.test('\n' + body)) errs.push('"## 자주 묻는 질문" 섹션 없음');
  if ((body.match(/\n###\s+Q\./g) || []).length < 2) errs.push('FAQ 질문(### Q.) 2개 이상 필요');
  if ((body.match(/^##\s/mg) || []).length < 4) errs.push('## 소제목 4개 이상 필요(FAQ 포함)');
  if (!/\]\(\/(?:rates|lesson|reserve|quote|location|stay)\//.test(body)) errs.push('요금·강습·예약 등 사이트 내부 링크 1개 이상 필요');
  for (const [re, why] of BANNED) { const m = md.match(re); if (m) errs.push(`금지 표현(${why}): "${m[0]}"`); }
  for (const c of NAMES) if (md.includes(c)) errs.push(`다른 업체 이름 사용: ${c}`);
  for (const m of md.matchAll(/https?:\/\/[^\s)]+/g)) if (!OK_LINK.test(m[0])) errs.push(`허용되지 않은 외부 링크: ${m[0]}`);
  for (const m of body.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    const u = m[1].split('#')[0];
    const ok = PATHS.includes(u) || (/^\/blog\/([a-z0-9-]+)\/$/.test(u) && slugs.has(u.split('/')[2]));
    if (!ok) errs.push(`없는 내부 주소: ${m[1]}`);
    const mine = meta.date ? `${meta.date} ${meta.time || '00:00'}` : null, target = /^\/blog\/([a-z0-9-]+)\/$/.test(u) ? when.get(u.split('/')[2]) : null;
    if (mine && target && target > mine) errs.push(`아직 공개 전인 글로 링크: ${u} (${target} 공개)`);
  }
  const unknown = new Set();
  for (const m of body.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(만\s?원|원|%|퍼센트|개월|일|년|건|명|시간|분|회|대|평|실|인)/g)) {
    const n = m[1].replace(/,/g, '');
    if (!allowed.has(n)) unknown.add(m[0]);
  }
  if (unknown.size) errs.push(`사실 목록에 없는 수치: ${[...unknown].slice(0, 8).join(', ')}`);
  return { ok: errs.length === 0, errs, meta, len };
}

const SYSTEM = sheet => `당신은 용평·알펜시아 스키 렌탈·강습 전문점 「뽀드득」의 블로그 담당자입니다. 용평리조트(모나 용평)·알펜시아 스키장에 가려는 사람이 네이버·구글·AI 에게 묻는 질문에, 매장에서 매일 손님을 응대하는 직원이 직접 답하듯 글을 씁니다. 읽는 사람은 스키를 처음 타는 대학생, 아이와 함께 가는 부모, 친구·회사 단체 여행 총무입니다.

# 반드시 지킬 것
- [사실 목록]에 있는 내용만 뽀드득에 관한 사실로 씁니다. 목록에 없는 요금·할인율·영업 정보·후기·고객 사례·수상 실적을 만들지 않습니다. 스키장 개장일, 슬로프 수, 리프트 대기 시간처럼 확인할 수 없는 수치는 쓰지 않습니다.
- 요금은 「${D.SITE.season} 용평리조트 기준, 뽀드득 예약가」처럼 기준을 붙이고, 0원(문의)인 항목은 「전화 문의」로 씁니다.
- 다른 렌탈샵 상호를 쓰지 않고, 다른 업체를 깎아내리지 않습니다. 「가장 싸다」 「1위」 같은 비교·최상급 표현을 쓰지 않습니다.
- 안전을 보장하는 표현을 쓰지 않습니다. 헬멧·보호대 착용, 강습, 정설시간 같은 안전 수칙은 사실대로 권합니다.
- 상투 표현(알아보겠습니다, 살펴보겠습니다, 결론적으로, 요약하자면, 꿀팁, 이 글에서는)과 이모지를 쓰지 않습니다.

# 문체
- 존댓말 「-습니다/-입니다」체. 한 문장은 짧게, 한 문단은 2~4문장.
- 첫 문단에서 질문에 바로 답합니다(결론 먼저). 그다음 이유, 그다음 손님이 오늘 할 일(예약·준비물).
- 「포함할 검색어」 중 1순위 검색어를 제목 맨 앞과 첫 문단에 자연스럽게 넣고, 나머지 검색어는 소제목·본문에 한 번씩만 씁니다. 같은 검색어를 반복해 채우지 않습니다.
- 매장 카운터에서 오가는 말투와 구체적인 장면(아침 8시 장비 수령, 정설시간 전에 슬로프에서 나오기, 아이 부츠 사이즈 맞추기 등)을 씁니다. 같은 문장 구조를 반복하지 않습니다.
- 요금 비교는 마크다운 표, 순서는 번호 목록. 굵은 글씨는 글 전체에서 3번 이하.
- 사이트 내부 링크는 ${PATHS.join(', ')} 와 기존 글 /blog/<slug>/ 만 씁니다. 요금·예약 페이지(/rates/rental/, /rates/lift/, /lesson/, /reserve/ 중 하나 이상)를 꼭 한 번 연결합니다. 외부 링크는 쓰지 않습니다.
- 글 끝에서 예약을 강요하지 않습니다. 「날짜와 인원만 알려 주시면 견적을 안내해 드립니다」 정도로 한 번 연결하면 충분합니다.

# 출력 형식 (이 형식 외의 말은 출력하지 않습니다)
---
title: (12~40자 — 1순위 검색어로 시작하고 검색 질문이 드러나게)
description: (40~80자 — 1순위 검색어로 시작해 글의 답을 한 문장으로)
slug: (영문 소문자-하이픈, 주제 뜻이 드러나게)
category: (${D.BLOG.categories.join(' | ')} 중 하나)
tags: (쉼표로 구분 3~5개)
keyword: (이 글이 1순위로 노리는 검색어 하나 — 아래 「이미 쓰인 1순위 검색어」와 겹치면 안 됨)
cover: (카드 표지 문구, 28자 이내)
---
(첫 문단: 질문에 대한 답)

## (소제목 3~6개)
...

## 자주 묻는 질문

### Q. (질문)
(답 1~3문장)

### Q. (질문)
(답 1~3문장)

본문은 공백 제외 1,500~3,000자로 씁니다.

[사실 목록]
${sheet}`;

function userMsg(topic, posts, today) {
  return `오늘 날짜: ${today}
주제 ID: ${topic.id}
주제: ${topic.title}
다룰 방향: ${topic.angle}
포함할 검색어: ${(topic.keywords || []).join(', ')}
권장 카테고리: ${topic.category}

이미 발행된 글(같은 내용을 반복하지 말고, 관련 있으면 내부 링크로 연결):
${posts.slice(0, 60).map(p => `- ${p.title} → /blog/${p.slug}/`).join('\n') || '- 없음'}

이미 쓰인 1순위 검색어(이것과 같은 검색어를 노리지 말 것):
${[...new Set(loadPosts(BLOG).map(p => p.keyword).filter(Boolean))].join(', ') || '없음'}

위 형식대로 글 한 편을 써 주세요.`;
}

async function callClaude(client, system, messages) {
  if (client.dry) { // --dry <파일>: API 대신 파일 내용을 응답으로 써서 발행 경로만 시험
    const text = fs.readFileSync(client.dry, 'utf8').replace(/^(date|time|author|generated|topic):.*\r?\n/gm, '').trim();
    return { text, res: { usage: { input_tokens: 0, output_tokens: 0 }, model: 'dry-run', content: [{ type: 'text', text }] } };
  }
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',                // 안전 분류기가 거절하면 서버가 권장 모델로 다시 시도
    output_config: { effort: 'high' },   // Opus 5.5 기본값은 medium — 글 품질을 위해 high
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
  });
  if (res.stop_reason === 'refusal') return { refused: true, res };
  if (res.stop_reason === 'max_tokens') throw new Error('max_tokens 도달 — 글이 잘렸습니다');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim().replace(/^```(?:markdown)?\s*|\s*```$/g, '');
  return { text, res };
}

const nowKST = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
};
const indexOf = posts => { const keywords = new Map(), when = new Map(); for (const p of posts) { for (const k of kwNorm(p.keyword)) keywords.set(k, p.slug); when.set(p.slug, `${p.date} ${p.time || '00:00'}`); } return { keywords, when }; };

async function writeOne(client, topics, sheet, allowed) {
  const posts = loadPosts(BLOG);
  const id = opt('--topic');
  const topic = id ? topics.find(t => t.id === id) : nextTopic(topics, posts);
  if (!topic) { console.log('작성할 주제가 없습니다.'); return false; }
  const { date, time } = nowKST();
  const system = SYSTEM(sheet);
  const messages = [{ role: 'user', content: userMsg(topic, posts, date) }];
  const slugs = new Set(posts.map(p => p.slug)), titles = posts.map(p => p.title);
  const { keywords, when } = indexOf(posts);
  console.log(`주제: ${topic.id} — ${topic.title}`);

  let out, v;
  for (let attempt = 1; attempt <= 2; attempt++) {
    out = await callClaude(client, system, messages);
    if (out.refused) { console.log(`거절됨(${out.res.stop_details?.category ?? '분류 없음'}) — 이 주제는 건너뜁니다.`); topic.status = 'skipped'; topic.note = 'refusal'; return true; }
    const u = out.res.usage;
    console.log(`응답 ${attempt}차: 입력 ${u.input_tokens} / 캐시 읽기 ${u.cache_read_input_tokens ?? 0} / 출력 ${u.output_tokens} 토큰, 모델 ${out.res.model}`);
    v = validate(out.text.replace(/^---\n/, `---\ndate: ${date}\ntime: ${time}\n`), { allowed, slugs, titles, keywords, when });
    if (v.ok) break;
    console.log('검증 실패:\n  - ' + v.errs.join('\n  - '));
    if (attempt === 1) {
      messages.push({ role: 'assistant', content: out.res.content.filter(b => b.type !== 'fallback') });
      messages.push({ role: 'user', content: `아래 문제를 고쳐서 같은 형식으로 글 전체를 다시 써 주세요.\n- ${v.errs.join('\n- ')}` });
    }
  }

  let meta, body;
  try { ({ meta, body } = parseFrontmatter(out.text)); } catch { meta = { title: topic.title, tags: [] }; body = out.text; }
  const slug = meta.slug && /^[a-z0-9-]+$/.test(meta.slug) ? meta.slug : topic.id;
  const front = ['---', `title: ${meta.title}`, `description: ${meta.description || ''}`, `slug: ${slug}`, `date: ${date}`, `time: ${time}`,
    `category: ${meta.category || topic.category}`, `tags: ${(meta.tags || []).join(', ')}`, `keyword: ${meta.keyword || ''}`, `cover: ${meta.cover || ''}`,
    `author: ${D.BLOG.author}`, `generated: ${MODEL} ${date}`, `topic: ${topic.id}`, '---'].join('\n');
  const md = `${front}\n${body}\n`;
  if (!v.ok) {
    fs.mkdirSync(DRAFTS, { recursive: true });
    const f = path.join(DRAFTS, `${date}-${topic.id}.md`);
    fs.writeFileSync(f, `<!-- 검증 실패로 발행하지 않음:\n- ${v.errs.join('\n- ')}\n-->\n` + md);
    console.log(`초안으로 저장: ${path.relative(ROOT, f)}`);
    topic.status = 'draft'; topic.draft = path.relative(ROOT, f).replace(/\\/g, '/');
  } else {
    const f = path.join(BLOG, `${slug}.md`);
    fs.writeFileSync(f, md);
    console.log(`발행: ${path.relative(ROOT, f)} (${v.len}자)`);
    topic.status = 'done'; topic.slug = slug; topic.date = date;
  }
  return true;
}

async function main() {
  const sheet = factSheet();
  const allowed = allowedNumbers(sheet);
  if (flag('--sheet')) { console.log(sheet); console.log('\n[허용 수치] ' + [...allowed].sort((a, b) => a - b).join(', ')); return; }
  const posts = loadPosts(BLOG);
  if (opt('--check-file')) {
    const f = path.resolve(opt('--check-file')), md = fs.readFileSync(f, 'utf8'), me = parseFrontmatter(md).meta.slug;
    const others = posts.filter(p => p.slug !== me), { keywords, when } = indexOf(others);
    for (const p of posts) when.set(p.slug, `${p.date} ${p.time || '00:00'}`);
    const v = validate(md, { allowed, slugs: new Set(others.map(p => p.slug)), titles: others.map(p => p.title), keywords, when });
    console.log(`${v.ok ? 'OK' : 'NG'} ${path.basename(f)} (${v.len ?? '?'}자)${v.ok ? '' : '\n  - ' + v.errs.join('\n  - ')}`);
    process.exit(v.ok ? 0 : 1);
  }
  if (flag('--check')) {
    let bad = 0;
    for (const f of fs.readdirSync(BLOG).filter(f => f.endsWith('.md') && !f.startsWith('_'))) {
      const md = fs.readFileSync(path.join(BLOG, f), 'utf8'), me = parseFrontmatter(md).meta.slug;
      const others = posts.filter(p => p.slug !== me), { keywords, when } = indexOf(others);
      for (const p of posts) when.set(p.slug, `${p.date} ${p.time || '00:00'}`);
      const v = validate(md, { allowed, slugs: new Set(others.map(p => p.slug)), titles: [], keywords, when });
      console.log(`${v.ok ? 'OK ' : 'NG '} ${f} (${v.len ?? '?'}자)${v.ok ? '' : '\n    - ' + v.errs.join('\n    - ')}`);
      if (!v.ok) bad++;
    }
    process.exit(bad ? 1 : 0);
  }
  const topics = JSON.parse(fs.readFileSync(TOPICS, 'utf8'));
  if (flag('--plan')) {
    const copy = JSON.parse(JSON.stringify(topics));
    for (let i = 0; i < 10; i++) { const t = nextTopic(copy, posts); if (!t) break; console.log(`${i + 1}. [${t.category}] ${t.title} (${t.id}) — ${(t.keywords || []).join(', ')}`); t.status = 'planned'; }
    return;
  }
  const cap = +(opt('--cap') || 0);
  if (cap) {
    const { date } = nowKST();
    const n = posts.filter(p => p.date === date).length;   // 예약 글 포함
    if (n >= cap) { console.log(`오늘(${date}) 글 ${n}편(예약 포함) — 상한 ${cap}편이라 새로 쓰지 않습니다.`); return; }
  }
  let client;
  if (opt('--dry')) client = { dry: path.resolve(opt('--dry')) };
  else { const { default: Anthropic } = await import('@anthropic-ai/sdk'); client = new Anthropic(); }
  const count = Math.max(1, Math.min(5, +(opt('--count') || 1)));
  for (let i = 0; i < count; i++) {
    const did = await writeOne(client, topics, sheet, allowed);
    fs.writeFileSync(TOPICS, JSON.stringify(topics, null, 2) + '\n');
    if (!did) break;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(async err => {
  const { default: Anthropic } = await import('@anthropic-ai/sdk').catch(() => ({ default: null }));
  if (Anthropic && err instanceof Anthropic.AuthenticationError) console.error('인증 실패: ANTHROPIC_API_KEY를 확인하세요.');
  else if (Anthropic && err instanceof Anthropic.RateLimitError) console.error('요청 한도 초과: 잠시 뒤 다시 실행하세요.');
  else if (Anthropic && err instanceof Anthropic.BadRequestError) console.error('요청 오류(400):', err.message);
  else if (Anthropic && err instanceof Anthropic.APIConnectionError) console.error('연결 오류:', err.message);
  else if (Anthropic && err instanceof Anthropic.APIError) console.error(`API 오류 ${err.status}:`, err.message);
  else console.error(err);
  process.exit(1);
});
