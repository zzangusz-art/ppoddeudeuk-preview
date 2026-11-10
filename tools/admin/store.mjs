// 어드민 콘텐츠 저장소 — 공지·갤러리·요금 등 '사이트에 보이는 내용'은 저장소 파일(content/site.json + 사진)로 저장한다
//   GitHub(운영): GITHUB_TOKEN(이 저장소 Contents 읽기·쓰기만 허용한 fine-grained 토큰), GITHUB_REPO(기본 zzangusz-art/ppoddeudeuk-preview), GITHUB_BRANCH(기본 main)
//     저장 = 커밋 1개(여러 파일 한 번에) → GitHub Pages·Railway 가 자동으로 다시 빌드·배포(약 1~2분)
//   로컬(시험): ADMIN_STORE=local → 이 폴더 파일을 직접 고치고 바로 빌드
//   접수(이름·연락처)는 여기가 아니라 db.mjs(SQLite)에 — 저장소에는 개인정보를 넣지 않는다
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function makeStore(root) {
  return process.env.ADMIN_STORE === 'local' ? localStore(process.env.ADMIN_LOCAL_ROOT || root) : githubStore();
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
