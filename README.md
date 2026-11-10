# 뽀드득 공식 홈페이지 (신규 제작) — 기존 홈페이지 미러링 + AEO·GEO·SEO

기존 홈페이지(ppoddeudeuk.phpweb.co.kr, 웹사이트닷컴 제작)의 메뉴 8개와 내용을 그대로 옮겨 새로 만든 정적 사이트입니다. 외부 패키지 없이 Node 22 이상만 있으면 됩니다.

## 바로 보기
- `preview.bat` 더블클릭 → 빌드 후 http://localhost:5540 이 열립니다(검색 노출 차단 미리보기).
- 직접: `node build.mjs --preview http://localhost:5540/` → `node tools/serve.mjs 5540`
  - 파이썬 `http.server`는 영상 이어받기(Range)를 못 해서 아이폰 사파리에서 영상이 안 나옵니다. `tools/serve.mjs`를 쓰세요.

## 폴더
| 경로 | 내용 |
|---|---|
| `src/data.mjs` | **요금·타임표·강습·숙박·주소·FAQ — 사실 정보는 여기 한 곳만 고칩니다.** 페이지 문구·JSON-LD·llms.txt·예약 폼 선택지가 모두 이 값을 씁니다 |
| `src/pages.mjs` | 페이지 본문(홈·소개·오시는 길·공지·FAQ·갤러리·중고장터·리프트·렌탈·숙박 3·강습 3·예약·견적·개인정보) |
| `src/layout.mjs` | `<head>`(메타·OG·JSON-LD·분석 태그), 헤더(기존 메뉴 구조), 전체 메뉴 드로어, 푸터, 모바일 하단 바, 사진 모달, 토스트 |
| `src/schema.mjs` | 구조화 데이터: LocalBusiness+SportsActivityLocation(요금 23개 Offer), WebSite, WebPage, FAQPage, BreadcrumbList, Course, Service, Product |
| `assets/css/style.css` · `assets/js/app.js` | 디자인(Noto Sans KR) / 히어로 영상·탭·아코디언·라이트박스(휴대폰은 바텀시트)·드로어·토스트·스켈레톤·슬라이더·3단계 예약 폼·카카오 지도 |
| `assets/video/` | 히어로 영상 PC 1920(21MB)·1280(11.8MB)·휴대폰 세로 720×900(7.2MB), 79초. 만드는 법 `../motion/tools/render_hero.py` |
| `assets/img/` | 기존 사이트 사진(매장 내부·콘도 객실·갤러리) WebP, 영상 장면, 로고 — `python -I tools/prepare_images.py` 로 다시 만듦 |

## 수정 → 반영
1. 요금·문구 `src/data.mjs`, 화면 `src/pages.mjs`, 디자인 `assets/css/style.css`
2. `build.bat` — 모든 페이지·JSON-LD·sitemap·robots·llms.txt가 같이 바뀌고 깨진 링크·JSON-LD 오류·페이지당 H1 개수를 검사합니다(오류면 실패).

## 관리자 어드민 · 접수 DB · 블로그 자동 발행 (2026-11-10)
- **어드민** `/admin` — 대시보드 · 접수 관리(빠른 문의·견적·예약, SQLite DB) · 접속 통계 · 블로그 · 공지 · 갤러리 · 중고장비 · FAQ · 강사진 · 요금(리프트·렌탈·강습) · 팝업 · 기본정보 / 관리자 전용: 추적 코드 · 작업 기록 · 계정 관리. 코드 `tools/admin/`.
- **저장 위치**: 접수(이름·연락처) = 서버 볼륨 `DATA_DIR/ppoddeudeuk.db` (git에 절대 안 들어감, 완료·취소 6개월 뒤 자동 삭제) / 사이트 내용 = `content/site.json` + `assets/img/up/` 커밋 → 자동 재배포 / 계정 = `DATA_DIR/admin-users.json`(비밀번호 scrypt 해시).
- **계정 만들기**: `node tools/admin/make-users.mjs` → 저장소 **밖** `../관리자/관리자_계정.txt`(첫 비밀번호 + Railway 변수 값). 저장소가 공개라 계정 파일을 이 폴더에 두지 말 것.
- **로컬 시험**: `toolsdmin-local.bat` → http://localhost:5540/admin (접수 DB는 `.data/`, 저장하면 이 폴더 파일을 바로 고치고 빌드).
- **Railway 배포**: 이 저장소 연결 → `railway.json`(빌드 `node build.mjs`, 시작 `node tools/serve.mjs`) → Volumes 에 `/data` → Variables: `DATA_DIR=/data`, `SESSION_SECRET`, `ADMIN_USERS`, `GITHUB_TOKEN`(이 저장소 Contents 읽기·쓰기 fine-grained), `API_BASE=self`, `SITE_PREVIEW_URL=https://<railway 주소>/`·`SITE_NOINDEX=1`(도메인 전), `ALLOW_ORIGINS=https://zzangusz-art.github.io`. GitHub Pages 미리보기에서도 접수가 되게 하려면 저장소 Variables 에 `API_BASE=https://<railway 주소>`.
- **블로그**: `content/blog/*.md` (머리말 date·time 이 지난 글만 공개 = 예약 발행). `tools/blog-ai/generate.mjs` 가 `content/blog/_topics.json`(메인 키워드 우선) 순서로 글을 쓰고 검증(사실 목록 밖 수치·과장·금지 표현·내부 링크·키워드 중복)을 통과해야 발행, 실패하면 `content/drafts/`. GitHub Actions 가 매일 09:05·13:05·18:05(KST)에 1편씩(하루 3편 상한, 예약 글 포함) — **저장소 Secrets 에 `ANTHROPIC_API_KEY` 필요**(없으면 글 작성만 건너뛰고 예약 글 공개·배포는 진행).

## 운영 전환 때 할 일
- 도메인 확정 후 `set SITE_URL=https://도메인/` → `node build.mjs --cname 도메인` (미리보기 아님 = 검색 노출 허용, robots에 AI 봇 허용, canonical·sitemap이 그 주소)
- 방문 분석: `set GA4_ID=G-...` `set NAVER_WA=...` 후 빌드(운영 빌드에만 태그가 들어갑니다). 서치어드바이저·서치콘솔 인증값은 `src/data.mjs`의 `analytics.naverVerify`·`googleVerify`
- 예약 접수 서버: `set LEAD_ENDPOINT=https://...` 후 빌드. 비어 있으면 폼이 접수 내용을 정리해 **문자로 보내기·복사·전화** 버튼을 보여 줍니다(서버 없이 동작).
