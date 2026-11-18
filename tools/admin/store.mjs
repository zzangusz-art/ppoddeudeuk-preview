// 어드민 콘텐츠 저장소 — 공지·갤러리·요금 등 '사이트에 보이는 내용'은 저장소 파일(content/site.json + 사진)로 저장한다
//   GitHub(운영): GITHUB_TOKEN(이 저장소 Contents 읽기·쓰기만 허용한 fine-grained 토큰), GITHUB_REPO(기본 zzangusz-art/ppoddeudeuk-preview), GITHUB_BRANCH(기본 main)
//     저장 = 커밋 1개(여러 파일 한 번에) → GitHub Pages·Railway 가 자동으로 다시 빌드·배포(약 1~2분)
//   로컬(시험): ADMIN_STORE=local → 이 폴더 파일을 직접 고치고 바로 빌드
//   접수(이름·연락처)는 여기가 아니라 db.mjs(SQLite)에 — 저장소에는 개인정보를 넣지 않는다
import fs from 'node:fs';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';

//   볼륨(운영 기본): DATA_DIR 이 있으면 Railway 볼륨에 저장하고 서버가 바로 다시 빌드(수 초). GitHub 토큰 불필요.
//     재배포(코드 변경)로 컨테이너가 새로 떠도 시작할 때 볼륨 내용을 다시 덮어써서 담당자가 올린 내용이 남는다.
//     ADMIN_STORE=github 로 예전 방식(커밋 → 자동 재배포)을 강제할 수 있다.
export function makeStore(root) {
  const mode = process.env.ADMIN_STORE || (process.env.DATA_DIR ? 'volume' : 'github');
  if (mode === 'local') return localStore(process.env.ADMIN_LOCAL_ROOT || root);
  if (mode === 'volume' && process.env.DATA_DIR) return volumeStore(root, path.join(process.env.DATA_DIR, 'content-store'));
  return githubStore();
}

// ── 볼륨 저장소
//   overlay/site-overrides.json : content/site.json 중 저장소(배포본)와 다른 항목만(키 단위) → 코드 쪽 site.json 변경과 섞여도 안 덮어씀
//   overlay/files/assets/img/up/… : 담당자가 올린 사진
//   저장 = 볼륨에 기록 + 실행 중인 폴더에 반영 → build.mjs 를 dist-next 에 돌려 dist 와 바꿔치기(중단 없이)
function volumeStore(root, dir) {
  const OV = path.join(dir, 'site-overrides.json'), FILES = path.join(dir, 'files'), LOG = path.join(dir, 'log.txt');
  const SITE = path.join(root, 'content', 'site.json');
  const DIST = path.resolve(root, process.env.DIST || 'dist'), NEXT = DIST + '-next', OLD = DIST + '-old';
  const ALLOW = /^(content\/site\.json|assets\/img\/up\/[\w.\-/]+)$/;
  const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
  const repoSite = readJson(SITE);   // 배포본(코드) 기준값 — 시작 시점에 한 번
  const abs = (base, p) => { const a = path.resolve(base, p); if (!a.startsWith(path.resolve(base) + path.sep)) throw new Error('경로 오류'); return a; };
  const merge = ov => { const s = { ...repoSite }; for (const [k, v] of Object.entries(ov)) { if (v && v.__deleted) delete s[k]; else s[k] = v; } return s; };
  const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];

  const STATUS_FILE = path.join(dir, 'build-status.json');
  let seq = 0, built = 0, failed = 0, building = null, again = false;
  let last = (() => { try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); } catch { return null; } })();
  const record = o => { last = { ...o, at: new Date().toISOString() }; try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(STATUS_FILE, JSON.stringify(last)); } catch { /* 기록 실패는 무시 */ } };
  async function rebuild() {
    if (building) { again = true; return building; }
    const n = seq;
    building = (async () => {
      const t0 = Date.now(); let stepName = 'prepare';
      try {
        stepName = 'build';
        await new Promise((ok, no) => execFile(process.execPath, ['build.mjs', '--out', path.relative(root, NEXT)], { cwd: root, env: process.env, timeout: 240000, maxBuffer: 8 * 1024 * 1024 }, (e, so, se) => e ? no(new Error(`${e.code ?? ''} ${e.signal ?? ''} ${(se || '').slice(-600)} ${(so || '').slice(-300)}`.trim() || e.message)) : ok()));
        // 폴더 통째 바꿔치기는 Railway(컨테이너 이미지 층)에서 EXDEV 로 실패 → 바뀐 파일만 dist 에 덮어쓰고, 없어진 파일은 지운다
        stepName = 'sync';
        const changed = syncDir(NEXT, DIST);
        built = Math.max(built, n); record({ ok: true, ms: Date.now() - t0, changed });
      } catch (e) { failed = n; console.error('사이트 다시 만들기 실패:', stepName, e.message); record({ ok: false, step: stepName, ms: Date.now() - t0, error: String(e.message || e).replaceAll(root, '.').slice(0, 900) }); }
      finally { building = null; if (again) { again = false; rebuild(); } }
    })();
    return building;
  }

  // 시작: 볼륨 내용을 실행 폴더에 덮어쓰고, 있으면 한 번 다시 빌드
  fs.mkdirSync(FILES, { recursive: true });
  const ov0 = readJson(OV), up0 = walk(FILES);
  for (const f of up0) { const rel = path.relative(FILES, f); fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.copyFileSync(f, path.join(root, rel)); }
  if (Object.keys(ov0).length || up0.length) { fs.writeFileSync(SITE, JSON.stringify(merge(ov0), null, 1) + '\n'); seq++; rebuild(); }

  // src 의 파일을 dst 에 맞춘다(크기·내용이 다른 파일만 복사, src 에 없는 파일은 삭제). 큰 파일(영상 등)은 크기·수정시각으로만 비교
  function syncDir(src, dst) {
    let n = 0;
    const same = (a, b) => { const x = fs.statSync(a), y = fs.statSync(b, { throwIfNoEntry: false }); if (!y || x.size !== y.size) return false; if (x.size > 2 * 1024 * 1024) return y.mtimeMs >= x.mtimeMs; return fs.readFileSync(a).equals(fs.readFileSync(b)); };
    const srcFiles = new Set();
    for (const f of walk(src)) { const rel = path.relative(src, f), t = path.join(dst, rel); srcFiles.add(rel); if (same(f, t)) continue; fs.mkdirSync(path.dirname(t), { recursive: true }); fs.copyFileSync(f, t + '.tmp'); fs.renameSync(t + '.tmp', t); n++; }
    for (const f of walk(dst)) { const rel = path.relative(dst, f); if (!srcFiles.has(rel)) { fs.rmSync(f, { force: true }); n++; } }
    return n;
  }
  return {
    kind: 'volume', ready: () => true,
    async read(p) { const a = abs(root, p); return fs.existsSync(a) ? { text: fs.readFileSync(a, 'utf8'), sha: String(fs.statSync(a).mtimeMs) } : null; },
    async commit(files, message) {
      for (const f of files) if (!ALLOW.test(f.path)) throw Object.assign(new Error('이 항목은 볼륨 저장소에서 바꿀 수 없습니다(관리자에게 요청)'), { status: 400 });
      for (const f of files) {
        if (f.path === 'content/site.json') {
          const next = JSON.parse(f.text), ov = {};
          for (const k of new Set([...Object.keys(repoSite), ...Object.keys(next)])) {
            if (!(k in next)) ov[k] = { __deleted: true };
            else if (JSON.stringify(next[k]) !== JSON.stringify(repoSite[k])) ov[k] = next[k];
          }
          fs.writeFileSync(OV + '.tmp', JSON.stringify(ov, null, 1)); fs.renameSync(OV + '.tmp', OV);
          fs.writeFileSync(SITE, JSON.stringify(merge(ov), null, 1) + '\n');
          continue;
        }
        const v = abs(FILES, f.path), r = abs(root, f.path);
        if (f.delete) { fs.rmSync(v, { force: true }); fs.rmSync(r, { force: true }); continue; }
        const buf = f.base64 != null ? Buffer.from(f.base64, 'base64') : Buffer.from(f.text);
        for (const a of [v, r]) { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, buf); }
      }
      fs.appendFileSync(LOG, `${new Date().toISOString()}\t${message.split('\n')[0].replace(/\t/g, ' ')}\t${files.length}\n`);
      const n = ++seq; rebuild();
      return { sha: 'vol-' + n };
    },
    async recent(n = 20) {
      try { return fs.readFileSync(LOG, 'utf8').trim().split('\n').slice(-n).reverse().map(l => { const [date, message] = l.split('\t'); return { sha: 'volume', message, author: '어드민', date }; }); }
      catch { return []; }
    },
    async status(sha) { const n = +String(sha).replace(/^vol-/, '') || 0; return { state: built >= n ? 'success' : failed >= n ? 'failure' : 'pending', ...(failed >= n && last && !last.ok ? { error: last.error } : {}) }; },
    info: () => ({ kind: 'volume', building: !!building, last }),
    rebuildNow: () => { seq++; return rebuild(); },
  };
}

function githubStore() {
  const REPO = process.env.GITHUB_REPO || 'zzangusz-art/ppoddeudeuk-preview', BRANCH = process.env.GITHUB_BRANCH || 'main';
  const token = () => process.env.GITHUB_TOKEN || '';
  async function gh(method, url, body) {
    const res = await fetch(`https://api.github.com/repos/${REPO}${url}`, { method,
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ppoddeudeuk-admin', ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    if (res.status === 404) return null;
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(`GitHub ${res.status}: ${j.message || ''}`); e.status = res.status === 401 || res.status === 403 ? 502 : res.status; throw e; }
    return j;
  }
  const enc = p => p.split('/').map(encodeURIComponent).join('/');
  return {
    kind: 'github', ready: () => !!token(),
    async read(p) {
      const j = await gh('GET', `/contents/${enc(p)}?ref=${BRANCH}`);
      if (!j || Array.isArray(j)) return null;
      let b64 = j.content;
      if (!b64 && j.sha) b64 = (await gh('GET', `/git/blobs/${j.sha}`)).content;
      return { text: Buffer.from(b64 || '', 'base64').toString('utf8'), sha: j.sha };
    },
    // files: [{ path, text } | { path, base64 } | { path, delete: true }]
    async commit(files, message, author) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const ref = await gh('GET', `/git/ref/heads/${BRANCH}`);
        const head = await gh('GET', `/git/commits/${ref.object.sha}`);
        const tree = [];
        for (const f of files) {
          if (f.delete) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
          const blob = await gh('POST', '/git/blobs', f.base64 != null ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' });
          tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
        }
        const t = await gh('POST', '/git/trees', { base_tree: head.tree.sha, tree });
        const c = await gh('POST', '/git/commits', { message, tree: t.sha, parents: [ref.object.sha], ...(author ? { author: { name: author, email: 'admin@ppoddeudeuk.co.kr', date: new Date().toISOString() } } : {}) });
        try { await gh('PATCH', `/git/refs/heads/${BRANCH}`, { sha: c.sha, force: false }); return { sha: c.sha }; }
        catch (e) { if (e.status !== 422 || attempt === 2) throw e; }
      }
    },
    async recent(n = 20) {
      const j = await gh('GET', `/commits?sha=${BRANCH}&per_page=${n}`);
      return (j || []).map(c => ({ sha: c.sha, message: c.commit.message, author: c.commit.author.name, date: c.commit.author.date }));
    },
    // 사이트 반영 상태: GitHub Actions(Pages 빌드) 체크 + Railway 커밋 상태
    async status(sha) {
      const [runs, st] = await Promise.all([gh('GET', `/commits/${sha}/check-runs`).catch(() => null), gh('GET', `/commits/${sha}/status`).catch(() => null)]);
      const list = [...((runs && runs.check_runs) || []).map(r => r.status !== 'completed' ? 'pending' : r.conclusion === 'success' || r.conclusion === 'skipped' ? 'success' : 'failure'),
        ...((st && st.statuses) || []).map(s => s.state === 'success' ? 'success' : s.state === 'pending' ? 'pending' : 'failure')];
      if (!list.length) return { state: 'pending' };
      return { state: list.includes('failure') ? 'failure' : list.includes('pending') ? 'pending' : 'success' };
    },
  };
}

function localStore(root) {
  const abs = p => { const a = path.resolve(root, p); if (!a.startsWith(path.resolve(root) + path.sep)) throw new Error('경로 오류'); return a; };
  let pending = null;
  // 저장 뒤 바로 빌드(미리보기 주소는 ADMIN_LOCAL_PREVIEW, 기본 http://localhost:5540/)
  const rebuild = () => { if (process.env.ADMIN_LOCAL_NOBUILD) return; clearTimeout(pending); pending = setTimeout(() => { try { execFileSync(process.execPath, ['build.mjs', '--preview', process.env.ADMIN_LOCAL_PREVIEW || 'http://localhost:5540/'], { cwd: root, stdio: 'ignore', env: { ...process.env, API_BASE: process.env.API_BASE || 'self' } }); } catch (e) { console.error('로컬 빌드 실패', e.message); } }, 200); };
  return {
    kind: 'local', ready: () => true,
    async read(p) { const a = abs(p); return fs.existsSync(a) ? { text: fs.readFileSync(a, 'utf8'), sha: String(fs.statSync(a).mtimeMs) } : null; },
    async commit(files, message) {
      for (const f of files) {
        const a = abs(f.path);
        if (f.delete) { if (fs.existsSync(a)) fs.unlinkSync(a); continue; }
        fs.mkdirSync(path.dirname(a), { recursive: true });
        fs.writeFileSync(a, f.base64 != null ? Buffer.from(f.base64, 'base64') : f.text);
      }
      fs.appendFileSync(path.join(root, '.data', 'admin-local.log'), `[${new Date().toLocaleString('ko-KR')}] ${message.split('\n')[0]} (${files.length}개 파일)\n`);
      rebuild();
      return { sha: 'local-' + Date.now() };
    },
    async recent(n = 20) {
      try { return fs.readFileSync(path.join(root, '.data', 'admin-local.log'), 'utf8').trim().split('\n').slice(-n).reverse().map(l => ({ sha: 'local', message: l.replace(/^\[[^\]]+\]\s*/, ''), author: '로컬', date: (l.match(/^\[([^\]]+)\]/) || [])[1] || '' })); }
      catch { return []; }
    },
    async status() { return { state: 'success' }; },
  };
}
