// 뽀드득 블로그 글(content/blog/*.md) 읽기: 머리말 파싱 + 필요한 만큼의 마크다운 → HTML, 목차·FAQ 추출
// (미래애드원·잠스쿨 사이트 tools/blog/lib.mjs 와 같은 방식. 사이트 내부 링크는 '/rates/rental/' 처럼 쓰고 빌드 때 상대 경로로 바꾼다)
import fs from 'node:fs';
import path from 'node:path';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function parseFrontmatter(src) {
  const m = src.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('머리말(---)이 없습니다');
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  meta.tags = (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  return { meta, body: m[2].trim() };
}

// 인라인: **굵게**, [링크](주소). 사이트 내부 링크는 '/services/…' 처럼 쓰고, R(상대 접두사)로 바꾼다
function inline(t, R) {
  let s = esc(t);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => {
    href = href.replace(/&amp;/g, '&');
    let safe = '#', ext = false;
    if (/^https?:\/\//i.test(href)) { safe = href; ext = !/ppoddeudeuk\.co\.kr/i.test(href); }
    else if (href.startsWith('/')) safe = R + href.slice(1);
    else if (href.startsWith('#')) safe = href;
    return `<a href="${esc(safe)}"${ext ? ' target="_blank" rel="noopener nofollow"' : ''}>${txt}</a>`;
  });
  return s;
}

export function renderMarkdown(md, R = '') {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [], toc = [];
  let i = 0, h2 = 0, para = [];
  const flush = () => { if (para.length) out.push(`<p>${inline(para.join(' '), R)}</p>`); para = []; };
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { flush(); i++; continue; }
    let m;
    if ((m = l.match(/^##\s+(.+)/)) && !l.startsWith('###')) {
      flush();
      const id = 'h-' + (++h2); toc.push({ id, t: m[1].trim() });
      out.push(`<h2 id="${id}">${inline(m[1].trim(), R)}</h2>`); i++; continue;
    }
    if ((m = l.match(/^###\s+(.+)/))) { flush(); out.push(`<h3>${inline(m[1].trim(), R)}</h3>`); i++; continue; }
    if (/^>\s?/.test(l)) {
      flush();
      const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(q.join(' '), R)}</blockquote>`); continue;
    }
    if (/^\|.*\|\s*$/.test(l)) {
      flush();
      const rows = []; while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]); const body = rows.slice(/^\|\s*:?-{2,}/.test(rows[1] || '') ? 2 : 1).map(cells);
      out.push(`<div class="tblwrap"><table><thead><tr>${head.map(c => `<th scope="col">${inline(c, R)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c, R)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l)) {
      flush();
      const ordered = /^\s*\d+[.)]\s+/.test(l), items = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) items.push(lines[i++].replace(/^\s*(?:[-*]|\d+[.)])\s+/, ''));
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map(t => `<li>${inline(t, R)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    para.push(l.trim()); i++;
  }
  flush();
  return { html: out.join('\n'), toc };
}

// "## 자주 묻는 질문" 아래 "### Q. 질문" + 답 문단을 FAQ로 떼어 낸다
export function splitFaq(body) {
  const m = body.match(/\n##\s+자주 묻는 질문\s*\n([\s\S]*?)(?=\n##\s|$)/);
  if (!m) return { body, faq: [] };
  const faq = [];
  for (const part of m[1].split(/\n###\s+/).map(s => s.trim()).filter(Boolean)) {
    const [qLine, ...rest] = part.split('\n');
    const q = qLine.replace(/^###\s*/, '').replace(/^Q[.:]\s*/, '').trim();
    const a = rest.join('\n').trim().replace(/^A[.:]\s*/, '');
    if (q && a) faq.push({ q, a });
  }
  return { body: body.replace(m[0], '\n'), faq };
}

// R: 글 페이지(blog/<slug>/)에서 사이트 루트까지의 상대 접두사
// today: 'YYYY-MM-DD'(그날 글 전부) / now: { date, time }(그 시각까지 글만 — 하루 3편 09·13·18시 예약용)
export function loadPosts(dir, { R = '../../', today = null, now = null } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_')).map(f => {
    const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const k of ['title', 'description', 'slug', 'date', 'category']) if (!meta[k]) throw new Error(`${f}: ${k} 누락`);
    const { body: main, faq } = splitFaq(body);
    const { html, toc } = renderMarkdown(main, R);
    const chars = body.replace(/\s+/g, '').length;
    return { ...meta, file: f, html, toc, faq: faq.map(x => ({ q: x.q.replace(/\*\*/g, ''), a: x.a.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') })), minutes: Math.max(2, Math.ceil(chars / 500)), chars, text: main };
  }).filter(p => now ? (p.date < now.date || (p.date === now.date && (p.time || '00:00') <= now.time)) : (!today || p.date <= today)) // 예약 발행: 아직 시각이 안 된 글은 빌드에서 뺀다
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.time || '').localeCompare(a.time || '') || a.slug.localeCompare(b.slug)));
}
