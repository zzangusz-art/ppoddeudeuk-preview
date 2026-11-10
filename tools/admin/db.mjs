// 접수 DB(SQLite, Node 내장 node:sqlite) — 홈페이지의 빠른 문의·견적문의·예약 접수가 여기에 저장되고 어드민 '접수 관리'에서 본다
//   파일: DATA_DIR/ppoddeudeuk.db (Railway 볼륨). 로컬은 ../.data/ppoddeudeuk.db (git 제외)
//   이름·연락처가 담기므로 저장소(git)에는 절대 넣지 않는다. 개인정보처리방침: 상담 종료(완료·취소) 후 6개월 → 자동 삭제
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.DATA_DIR || path.resolve(HERE, '..', '..', '.data');
export const DB_FILE = path.join(DIR, 'ppoddeudeuk.db');
export const dbPersistent = () => !!process.env.DATA_DIR || process.env.ADMIN_STORE === 'local';
fs.mkdirSync(DIR, { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created TEXT NOT NULL,            -- KST 'YYYY-MM-DD HH:MM:SS'
  type TEXT NOT NULL,               -- quick | quote | reserve
  status TEXT NOT NULL DEFAULT 'new', -- new | contacted | done | cancel
  name TEXT NOT NULL, phone TEXT NOT NULL,
  use_date TEXT, resort TEXT, time TEXT, people TEXT,
  detail TEXT,                      -- JSON: 문의 항목·장비·의류·강습
  memo TEXT, summary TEXT, page TEXT,
  admin_memo TEXT, updated TEXT, handled_by TEXT, ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS leads_status ON leads(status, created);
CREATE INDEX IF NOT EXISTS leads_phone ON leads(phone);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, user TEXT, action TEXT NOT NULL, target TEXT);`);

export const TYPES = { quick: '빠른 문의', quote: '견적문의', reserve: '예약' };
export const STATUS = { new: '신규', contacted: '연락함', done: '완료', cancel: '취소' };
export const kstNow = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
const one = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, n);
const line = (s, n) => one(s, n).replace(/\s+/g, ' ');
export const phoneFmt = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? (d.startsWith('02') ? `02-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`) : d.length === 9 ? `02-${d.slice(2, 5)}-${d.slice(5)}` : d; };
const list = (v, n = 20, m = 40) => (Array.isArray(v) ? v : v ? [v] : []).map(x => line(x, m)).filter(Boolean).slice(0, n);

// 홈페이지 접수 저장(검증 실패면 Error(status 400))
export function addLead(b, ipHash) {
  const bad = msg => Object.assign(new Error(msg), { status: 400 });
  const type = TYPES[b.type] ? b.type : null; if (!type) throw bad('접수 종류 오류');
  const name = line(b.name, 20); if (!name) throw bad('이름을 입력해 주세요');
  const digits = String(b.phone || '').replace(/\D/g, ''); if (!/^0\d{8,10}$/.test(digits)) throw bad('연락처를 확인해 주세요');
  if (!(b.agree === 'on' || b.agree === true || b.agree === 'true')) throw bad('개인정보 수집·이용 동의가 필요합니다');
  const useDate = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : '';
  const detail = { topic: list(b.topic), ski: list(b.ski), board: list(b.board), wear: list(b.wear), lesson: line(b.lesson, 20), lessonPeople: line(b.lessonPeople, 20), lessonHours: line(b.lessonHours, 20), qty: line(b.qty, 12), height: line(b.height, 12), foot: line(b.foot, 12) };
  for (const k of Object.keys(detail)) if (!detail[k] || (Array.isArray(detail[k]) && !detail[k].length)) delete detail[k];
  const resort = { yongpyong: '용평스키장', alpensia: '알펜시아스키장' }[b.resort] || line(b.resort, 30);
  const r = db.prepare(`INSERT INTO leads (created, type, name, phone, use_date, resort, time, people, detail, memo, summary, page, ip_hash, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(kstNow(), type, name, phoneFmt(digits), useDate, resort, line(b.time, 60), line(b.people, 10),
    JSON.stringify(detail), one(b.memo, 1000), one(b.summary, 3000), line(b.page, 200), ipHash || '', kstNow());
  return Number(r.lastInsertRowid);
}

const rowOut = r => r && ({ ...r, detail: (() => { try { return JSON.parse(r.detail || '{}'); } catch { return {}; } })(), typeName: TYPES[r.type], statusName: STATUS[r.status] });
export function listLeads({ status = '', type = '', q = '', page = 1, size = 30 } = {}) {
  const where = [], args = [];
  if (STATUS[status]) { where.push('status = ?'); args.push(status); }
  if (TYPES[type]) { where.push('type = ?'); args.push(type); }
  if (q) { const like = `%${String(q).trim().slice(0, 30)}%`; where.push('(name LIKE ? OR phone LIKE ? OR memo LIKE ? OR admin_memo LIKE ? OR replace(phone, \'-\', \'\') LIKE ?)'); args.push(like, like, like, like, `%${String(q).replace(/\D/g, '') || '@@'}%`); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT count(*) n FROM leads ${w}`).get(...args).n;
  const p = Math.max(1, +page || 1), n = Math.min(100, Math.max(5, +size || 30));
  const rows = db.prepare(`SELECT id, created, type, status, name, phone, use_date, resort, time, people, detail, memo, admin_memo, updated, handled_by FROM leads ${w} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, n, (p - 1) * n);
  return { total, page: p, size: n, items: rows.map(rowOut) };
}
export const getLead = id => rowOut(db.prepare('SELECT * FROM leads WHERE id = ?').get(+id));
export function updateLead(id, { status, adminMemo }, user) {
  const cur = getLead(id); if (!cur) return null;
  const st = STATUS[status] ? status : cur.status;
  db.prepare('UPDATE leads SET status = ?, admin_memo = ?, updated = ?, handled_by = ? WHERE id = ?').run(st, adminMemo == null ? cur.admin_memo : one(adminMemo, 2000), kstNow(), user, +id);
  audit(user, `접수 ${STATUS[st]}${adminMemo != null ? '·메모' : ''}`, `#${id}`);
  return getLead(id);
}
export function deleteLead(id, user) { const r = db.prepare('DELETE FROM leads WHERE id = ?').run(+id); if (r.changes) audit(user, '접수 삭제', `#${id}`); return r.changes > 0; }
export function counts() {
  const today = kstNow().slice(0, 10), month = today.slice(0, 7);
  const g = sql => db.prepare(sql).get().n;
  const byStatus = Object.fromEntries(Object.keys(STATUS).map(k => [k, 0]));
  for (const r of db.prepare('SELECT status, count(*) n FROM leads GROUP BY status').all()) byStatus[r.status] = r.n;
  const byType = Object.fromEntries(Object.keys(TYPES).map(k => [k, 0]));
  for (const r of db.prepare('SELECT type, count(*) n FROM leads GROUP BY type').all()) byType[r.type] = r.n;
  return { today: g(`SELECT count(*) n FROM leads WHERE created LIKE '${today}%'`), month: g(`SELECT count(*) n FROM leads WHERE created LIKE '${month}%'`), total: g('SELECT count(*) n FROM leads'), byStatus, byType, lastId: g('SELECT coalesce(max(id), 0) n FROM leads') };
}
// 날짜별 접수 수(대시보드 그래프)
export function dailyLeads(n = 14) {
  const from = kstNow(Date.now() - (n - 1) * 864e5).slice(0, 10);
  const m = new Map(db.prepare("SELECT substr(created, 1, 10) d, count(*) n FROM leads WHERE created >= ? GROUP BY d").all(from).map(r => [r.d, r.n]));
  return Array.from({ length: n }, (_, i) => { const d = kstNow(Date.now() - (n - 1 - i) * 864e5).slice(0, 10); return { date: d, n: m.get(d) || 0 }; });
}
// 예약·견적 확인(홈페이지): 이름 + 연락처가 모두 같은 최근 6개월 접수의 날짜·상태만
export function checkLeads(name, phone) {
  const from = kstNow(Date.now() - 183 * 864e5);
  return db.prepare('SELECT type, created, use_date, status FROM leads WHERE name = ? AND phone = ? AND created >= ? ORDER BY id DESC LIMIT 10')
    .all(line(name, 20), phoneFmt(phone), from).map(r => ({ type: TYPES[r.type], created: r.created.slice(0, 10), useDate: r.use_date || '', status: r.status, statusName: STATUS[r.status] }));
}
// CSV(엑셀) — 맨 앞 BOM 으로 엑셀 한글 깨짐 방지
export function csv({ status = '', type = '' } = {}) {
  const { items } = listLeads({ status, type, size: 100, page: 1 });
  let all = items, page = 1;
  while (all.length < listLeads({ status, type, size: 5 }).total && page < 200) { page++; all = all.concat(listLeads({ status, type, size: 100, page }).items); }
  const cell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
  const head = ['번호', '접수일시', '종류', '상태', '이름', '연락처', '이용날짜', '스키장', '이용타임', '인원', '문의 항목·장비', '고객 요청', '관리 메모', '처리자'];
  const rows = all.map(r => [r.id, r.created, r.typeName, r.statusName, r.name, r.phone, r.use_date, r.resort, r.time, r.people,
    Object.entries(r.detail).map(([k, v]) => `${{ topic: '문의', ski: '스키', board: '보드', wear: '의류', lesson: '강습', lessonPeople: '강습 인원', lessonHours: '강습 시간', qty: '장비 수량', height: '키', foot: '발 사이즈' }[k] || k}: ${Array.isArray(v) ? v.join('/') : v}`).join(' | '),
    r.memo, r.admin_memo, r.handled_by]);
  return '﻿' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
}
// 상담 종료(완료·취소) 후 6개월 지난 접수 자동 삭제 + 2년 넘은 기록 정리
export function purge() {
  const cut = kstNow(Date.now() - 183 * 864e5), old = kstNow(Date.now() - 730 * 864e5);
  const r = db.prepare("DELETE FROM leads WHERE status IN ('done', 'cancel') AND updated < ?").run(cut);
  db.prepare('DELETE FROM audit WHERE at < ?').run(old);
  if (r.changes) audit('system', '보관 기간 지난 접수 자동 삭제', `${r.changes}건`);
  return r.changes;
}
export function audit(user, action, target = '') { db.prepare('INSERT INTO audit (at, user, action, target) VALUES (?, ?, ?, ?)').run(kstNow(), user || '', action, target); }
export const auditLog = (n = 50) => db.prepare('SELECT at, user, action, target FROM audit ORDER BY id DESC LIMIT ?').all(n);
export const ipHash = ip => crypto.createHash('sha256').update('ppd|' + ip).digest('base64url').slice(0, 12);
purge(); setInterval(purge, 6 * 3600e3).unref();
