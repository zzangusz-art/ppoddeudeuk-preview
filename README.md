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

## 운영 전환 때 할 일
- 도메인 확정 후 `set SITE_URL=https://도메인/` → `node build.mjs --cname 도메인` (미리보기 아님 = 검색 노출 허용, robots에 AI 봇 허용, canonical·sitemap이 그 주소)
- 방문 분석: `set GA4_ID=G-...` `set NAVER_WA=...` 후 빌드(운영 빌드에만 태그가 들어갑니다). 서치어드바이저·서치콘솔 인증값은 `src/data.mjs`의 `analytics.naverVerify`·`googleVerify`
- 예약 접수 서버: `set LEAD_ENDPOINT=https://...` 후 빌드. 비어 있으면 폼이 접수 내용을 정리해 **문자로 보내기·복사·전화** 버튼을 보여 줍니다(서버 없이 동작).
