// 사이트 자체 방문 집계(어드민 '접속 통계') — GA4 없이도 보이게, 개인정보 없이 날짜별 숫자만 (잠스쿨 어드민과 같은 방식)
//   페이지 보기: 사이트 스크립트가 /api/t 로 보내는 {e:'pv', p:경로, r:이전 페이지, u:utm_source} — 스크립트를 실행하는 실제 브라우저만 셈
//                (사이트가 GitHub Pages 에 있어도 이 서버로 보내므로 셀 수 있다)
//   봇·AI 크롤러: 이 서버가 html 을 내줄 때 브라우저가 아닌 요청을 따로(countBot)
//   방문자: (IP + 브라우저)를 그날만 쓰는 소금값으로 해시해 하루 중복만 거른다. 다음 날 해시·소금값은 버리고 숫자만 남김. 쿠키 없음
//   클릭: 전화·문자·지도·빠른 접수 열기 / 접수: 서버가 접수를 저장할 때 lead(type)
//   저장: DATA_DIR/analytics/YYYY-MM-DD.json (Railway 볼륨). 볼륨이 없으면 STATS_DIR, 둘 다 없으면 메모리(재시작하면 사라짐)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'analytics') : (process.env.STATS_DIR || '');
export const persistent = () => !!DIR;
const kst = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
const days = new Map();

const blank = date => ({ date, pv: 0, uv: 0, entries: 0, pages: {}, sources: {}, refs: {}, ai: {}, search: {}, devices: {}, bots: {}, events: {}, leads: {}, _salt: crypto.randomBytes(16).toString('hex'), _seen: [] });
function day(date = kst()) {
  if (!days.has(date)) {
    let d = null;
    if (DIR) { const f = path.join(DIR, `${date}.json`); if (fs.existsSync(f)) try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* 깨진 파일 */ } }
    d = { ...blank(date), ...(d || {}) };
    if (date === kst() && !d._salt) Object.assign(d, { _salt: crypto.randomBytes(16).toString('hex'), _seen: [] });
    d._set = new Set(d._seen || []);
    days.set(date, d);
    for (const k of [...days.keys()]) if (k < kst(Date.now() - 2 * 864e5)) days.delete(k);
  }
  return days.get(date);
}
let dirty = false, timer = null;
export function flush() {
  if (!DIR || !dirty) return; dirty = false;
  fs.mkdirSync(DIR, { recursive: true });
  for (const d of days.values()) {
    const keep = d.date === kst();
    const { _set, ...rest } = d;
    const out = keep ? { ...rest, _seen: [..._set] } : (({ _salt, _seen, ...x }) => x)(rest);
    fs.writeFileSync(path.join(DIR, `${d.date}.json.tmp`), JSON.stringify(out)); fs.renameSync(path.join(DIR, `${d.date}.json.tmp`), path.join(DIR, `${d.date}.json`));
  }
}
const touch = () => { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 30000); };
const inc = (o, k, n = 1) => { if (!k) return; o[k] = (o[k] || 0) + n; };

const AI_HOSTS = [[/chatgpt\.com|chat\.openai\.com/, 'ChatGPT'], [/perplexity\.ai/, 'Perplexity'], [/gemini\.google\.com|bard\.google\.com/, 'Gemini'], [/copilot\.microsoft\.com|bing\.com\/chat/, 'Copilot'], [/claude\.ai/, 'Claude'], [/wrtn\.ai/, '뤼튼'], [/clova|cue\.search\.naver/, '네이버 AI'], [/you\.com|phind\.com|poe\.com|deepseek/, '기타 AI']];
function source(ref, selfHost, utm) {
  if (utm) return { group: `캠페인(${utm.slice(0, 30)})`, host: '' };
  if (!ref) return { group: '직접 방문', host: '' };
  let u; try { u = new URL(ref); } catch { return { group: '기타', host: '' }; }
  const h = u.hostname.replace(/^www\.|^m\./, '');
  if (!h || h === selfHost || h.endsWith('.' + selfHost)) return null;   // 사이트 안 이동
  for (const [re, name] of AI_HOSTS) if (re.test(h + u.pathname)) return { group: 'AI 답변', host: name };
  if (/search\.naver\.com/.test(h)) return { group: '네이버 검색', host: h, q: u.searchParams.get('query') || '' };
  if (/naver\.com|naver\.me/.test(h)) return { group: /map\.naver|place/.test(h + u.pathname) ? '네이버 지도·플레이스' : '네이버(블로그·카페)', host: h };
  if (/^google\.|\.google\./.test(h) || h === 'google.com') return { group: '구글', host: h };
  if (/daum\.net|kakao\.com|kakaocdn/.test(h)) return { group: /map\.kakao|place\.map/.test(h) ? '카카오맵' : /kakao/.test(h) ? '카카오' : '다음', host: h };
  if (/bing\.com/.test(h)) return { group: 'Bing', host: h };
  if (/instagram\.com|facebook\.com|threads\.net|t\.co$|twitter\.com|x\.com|youtube\.com|youtu\.be|tiktok\.com|band\.us/.test(h)) return { group: 'SNS·영상', host: h };
  return { group: '다른 사이트', host: h };
}
export const BOT_RE = /bot|crawl|spider|slurp|yeti|daumoa|preview|facebookexternalhit|kakaotalk-scrap|monitor|curl|wget|python|node-fetch|axios|go-http|java\/|headless|lighthouse|pingdom|uptime|semrush|ahrefs|mj12|petal|bytespider|gptbot|chatgpt-user|oai-searchbot|claude|anthropic|perplexity|ccbot|google-inspectiontool|google-extended|validator|scan/i;
const BOT_NAMES = [[/gptbot|oai-searchbot|chatgpt-user/i, 'OpenAI(ChatGPT)'], [/claudebot|claude-|anthropic/i, 'Anthropic(Claude)'], [/perplexity/i, 'Perplexity'], [/google-extended|googleother/i, 'Google AI'], [/googlebot|google-inspectiontool/i, 'Googlebot'], [/yeti/i, '네이버 Yeti'], [/bingbot|bingpreview/i, 'Bingbot'], [/daumoa|daum/i, '다음'], [/bytespider/i, 'ByteDance'], [/ccbot/i, 'Common Crawl']];
const device = ua => /ipad|tablet/i.test(ua) ? '태블릿' : /mobi|iphone|android/i.test(ua) ? '휴대폰' : 'PC';
// 접속 IP: X-Forwarded-For 의 첫 값은 접속자가 마음대로 넣을 수 있으므로(잠금·접수 제한 우회), 앞단 프록시(Railway)가 마지막에 붙인 값을 쓴다
export const clientIp = req => { const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean); return xff.length ? xff[xff.length - 1] : String(req.socket.remoteAddress || ''); };

// 서버가 html 을 내줄 때: 봇·AI 크롤러만 센다(사람은 스크립트 pv 로)
export function countBot(req) {
  try {
    const ua = String(req.headers['user-agent'] || '');
    if (ua && !BOT_RE.test(ua)) return;
    const b = BOT_NAMES.find(([re]) => re.test(ua)); inc(day().bots, b ? b[1] : '기타 봇·도구'); touch();
  } catch { /* 집계 실패가 페이지를 막지 않게 */ }
}

const EVENTS = new Set(['call_click', 'sms_click', 'map_click', 'quick_open']);
const rate = new Map();
// POST /api/t
export function countEvent(req, body) {
  const ua = String(req.headers['user-agent'] || '');
  if (!ua || BOT_RE.test(ua)) return;
  const ip = clientIp(req), now = Date.now(), r = rate.get(ip) || { n: 0, t: now };
  if (now - r.t > 60e3) { r.n = 0; r.t = now; } if (++r.n > 60) return; rate.set(ip, r);
  if (rate.size > 5000) rate.clear();
  const d = day(), e = String(body.e || '');
  if (e === 'pv') {
    const p = String(body.p || '/').split('?')[0].replace(/^\/ppoddeudeuk-preview/, '').replace(/index\.html$/, '').slice(0, 80) || '/';
    let selfHost = ''; try { selfHost = new URL(String(req.headers.origin || req.headers.referer || '')).hostname.replace(/^www\./, ''); } catch { /* 없음 */ }
    d.pv++; inc(d.pages, p);
    const id = crypto.createHash('sha256').update(d._salt + ip + ua).digest('base64url').slice(0, 16);
    const s = source(String(body.r || '').slice(0, 300), selfHost, String(body.u || '').slice(0, 40));
    if (!d._set.has(id)) { d._set.add(id); d.uv++; inc(d.devices, device(ua)); }
    if (s) { d.entries++; inc(d.sources, s.group); if (s.host) inc(s.group === 'AI 답변' ? d.ai : d.refs, s.host); if (s.q) inc(d.search, s.q.slice(0, 40)); }
  } else if (EVENTS.has(e)) inc(d.events, e);
  else return;
  touch();
}
export function countLead(type) { inc(day().leads, type); touch(); }

const ZERO = date => ({ date, pv: 0, uv: 0, entries: 0, pages: {}, sources: {}, refs: {}, ai: {}, search: {}, devices: {}, bots: {}, events: {}, leads: {} });
export function summary(n = 7) {
  const list = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = kst(Date.now() - i * 864e5);
    let d = days.get(date);
    if (!d && DIR) { const f = path.join(DIR, `${date}.json`); if (fs.existsSync(f)) try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* 무시 */ } }
    list.push({ ...ZERO(date), ...(d || {}) });
  }
  const add = (a, b) => { for (const [k, v] of Object.entries(b || {})) a[k] = (a[k] || 0) + v; return a; };
  const tot = ZERO('');
  for (const d of list) { tot.pv += d.pv; tot.uv += d.uv; tot.entries += d.entries; for (const k of ['pages', 'sources', 'refs', 'ai', 'search', 'devices', 'bots', 'events', 'leads']) add(tot[k], d[k]); }
  delete tot.date;
  return { days: list.map(d => ({ date: d.date, pv: d.pv, uv: d.uv, ai: Object.values(d.ai || {}).reduce((a, b) => a + b, 0), leads: Object.values(d.leads || {}).reduce((a, b) => a + b, 0), calls: (d.events || {}).call_click || 0 })), total: tot, persistent: persistent() };
}
