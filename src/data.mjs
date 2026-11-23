// 뽀드득 사이트의 사실 정보 — 여기 한 곳만 고치면 페이지·JSON-LD·llms.txt가 같이 바뀐다.
// 출처: 기존 홈페이지 ppoddeudeuk.phpweb.co.kr (2026-11-10 미러링), 관리자 백업본, 6월 18일 수정요청 엑셀(스키장별 타임표·강습 규칙).
// "확인 필요" 표시 값은 고객 확인 전 — project.md 참고.
// 어드민(/admin)에서 고친 값은 content/site.json 에 저장되고, 빌드할 때 아래 기본값 위에 덮어쓴다(키: site·tags·popup·notices·gallery·used·faq·instructors·lift·rental·lesson).
import fs from 'node:fs';
export const OVERRIDES = (() => { try { return JSON.parse(fs.readFileSync(new URL('../content/site.json', import.meta.url), 'utf8')); } catch { return {}; } })();
const D = {};   // 기본값(어드민 '기본값으로 되돌리기')
// 요금(리프트·렌탈)은 판(rev)이 있다. 업체가 새 요금표를 보내 기본값을 바꾸면 판을 올리고, 그 전에 어드민에 저장된 값(예전 판)은 쓰지 않는다.
// 판을 올린 뒤 어드민에서 저장한 값에는 새 판이 함께 저장된다(서버 clean 이 기본값의 rev 를 이어받음).
export const PRICE_REV = '2026-11-23';
const REV_KEYS = ['lift', 'rental', 'rentalAlp'];
export const isFresh = (k, v) => !REV_KEYS.includes(k) || (Array.isArray(v) ? v[0]?.rev : v?.rev) === PRICE_REV;
const ov = (k, def) => { D[k] = def; const o = OVERRIDES[k]; return o != null && isFresh(k, o) ? o : def; };

export const SITE = {
  name: '뽀드득',
  nameEn: 'PPODDEUDEUK',
  alt: ['용평 뽀드득', '용평렌탈샵 뽀드득', '뽀드득 렌탈샵', '겨울바라기', '겨울바라기 AC', '뽀드득 스키'],
  operator: '겨울바라기 AC',          // 2026-10-30 확약서 회사명
  ceo: '이건무',
  bizNo: '623-01-01018',
  phone: '033-336-9884',
  phoneHref: 'tel:0333369884',
  sms: '010-4024-9884',               // 확인 필요: 블로그·네이버 플레이스 안내 번호(직통·문자). 기존 홈페이지에는 없음
  hours: '시즌 중 매일 08:00~23:00',   // 확인 필요: 네이버 플레이스·블로그 안내 기준
  openingHours: 'Mo-Su 08:00-23:00',
  address: {
    full: '강원특별자치도 평창군 대관령면 올림픽로 238',
    old: '강원 평창군 대관령면 횡계리 344-66',
    region: '강원특별자치도', locality: '평창군 대관령면', street: '올림픽로 238', postal: '25342',
  },
  near: '용평리조트(모나 용평)·알펜시아 스키장까지 차로 약 5분',
  geo: { lat: 37.6651048, lng: 128.7047838 },              // 카카오맵 장소 2016256650 좌표(2026-11-19 확인)
  // 업체 공식 프로필(구조화 데이터 sameAs) — 같은 이름의 다른 '뽀드득'과 구분하는 근거. 네이버 플레이스·인스타그램 주소를 받으면 여기에 추가
  profiles: ['https://place.map.kakao.com/2016256650'],
  url: process.env.SITE_URL || 'https://bboski.co.kr/', // 운영 도메인(2026-11-16 연결)
  tagline: "눈밭 위 '뽀드득' 소리와 함께, 당신의 겨울이 시작됩니다",
  maps: {
    // 2026-11-19 수정: 예전 298093176 은 이천 '지산리조트 뽀드득 렌탈샵'(031-637-1141)이었다 — 같은 이름 다른 업체
    kakao: 'https://place.map.kakao.com/2016256650',         // 카카오맵 '뽀드득 렌탈샵' 평창 올림픽로 238 · 033-336-9884
    naver: 'https://map.naver.com/p/search/' + encodeURIComponent('강원 평창군 대관령면 올림픽로 238'),
    roughmap: { timestamp: '1774262744025', key: 'jtuqah69r4n' }, // 기존 사이트 카카오 지도 퍼가기 값
  },
  // 접수 API 주소(정해지면 입력). 비어 있으면 접수 내용을 정리해 문자·전화로 보내는 방식으로 동작
  // 접수·방문 집계 서버: API_BASE=self(사이트와 같은 서버, Railway) | https://…(다른 서버) | 비움 = 서버 없이 문자·전화로 보내기
  api: process.env.API_BASE === 'self' ? '' : (process.env.API_BASE || '').replace(/\/$/, '') || null,
  leadEndpoint: process.env.LEAD_ENDPOINT || '',
  analytics: { ga4: process.env.GA4_ID || '', naver: process.env.NAVER_WA || '', naverVerify: '', googleVerify: '' },
  season: '26/27 시즌',
  asof: '2026-11-10',
};

// 매장 규모(업체 제공 2026-11-16) — 소개 문구·구조화 데이터·llms.txt 공통
export const SCALE = { gear: '스키·스노보드 약 900대', wear: '하이엔드 의류 약 1,200벌', staff: '전문 자격증 보유 강사 30여 명' };

export const ABOUT = {
  lead: '겨울을 함께하는 스키 파트너, 뽀드득',
  // 메인·소개 「뽀드득은 어떤 곳인가요?」 아래 특징 — 업체 제공 문구(2026-11-20 엑셀). [본문, 덧붙임]
  // 6000천만원 → 6,000만 원으로 읽음(확인 필요). '다른 매장이 보유했다면 중고' 문장은 비방 소지가 있어 독점 계약 사실로 바꿔 적음
  points: [
    ['스키·스노보드 약 900대, 하이엔드 의류 약 1,200벌을 보유하고 있습니다.'],
    ['용평 유일, 어반그레이 & 픽고 의류를 독점 계약으로 보유한 하이엔드 렌탈샵입니다.', '용평 지역의 어반그레이·픽고 새 의류는 뽀드득이 독점 계약으로 들여옵니다.'],
    ['용평 유일, 버튼 스텝온을 보유한 초대형 하이엔드 렌탈샵입니다.'],
    ['적외선 레이저 왁싱기·핫 왁싱기 등 약 6,000만 원 상당의 튜닝 장비를 보유하고 있습니다.'],
    ['매년 최신 장비와 의류를 새로 들입니다. 26/27 시즌에는 장비·의류 약 5억 원 상당을 구입했습니다.'],
    ['전문 자격증을 갖춘 강사 30여 명이 함께하는 용평 최대 하이엔드 렌탈샵입니다.', '경력 7년 이상의 베테랑 강사진이 초급·중급·상급·최상급·자격증 취득 과정을 맡습니다.'],
  ],
  paras: [
    '안녕하세요. 뽀드득입니다. 뽀드득은 스키를 처음 시작하시는 분부터 숙련자까지, 누구나 안전하고 즐겁게 겨울을 즐길 수 있도록 프리미엄 렌탈과 전문 강습 서비스를 제공하고 있습니다.',
    '뽀드득은 매 시즌 장비 컨디션을 꼼꼼히 점검하고, 트렌드와 성능을 고려한 장비 구성을 통해 보다 쾌적한 렌탈 환경을 만들기 위해 노력합니다. 기존 렌탈샵과 달리 단순 대여에 그치지 않고, 고객님의 이용 목적과 실력에 맞춰 장비를 추천하여 안전성과 만족도를 함께 높일 수 있도록 안내해드립니다.',
    '또한 뽀드득은 공식 자격을 갖춘 소속 강사진과 함께, 초급부터 상급까지 수준별·목표별 맞춤 강습을 운영하고 있습니다. 기본 자세부터 턴, 스피드 컨트롤, 안전 수칙까지 단계적으로 지도하여 짧은 시간에도 확실한 성장을 경험하실 수 있도록 체계적으로 진행합니다.',
    '예약 및 견적 문의, 단체 강습 상담 등 궁금하신 사항이 있으시면 카카오톡 상담 또는 매장 연락처로 문의해주시기 바랍니다. 뽀드득이 친절하고 정확하게 안내해드리겠습니다.',
  ],
  interior: [
    ['interior-1', '스키 장비 진열대 전경'], ['interior-2', '스키 부츠 진열'], ['interior-3', '헬멧과 고글 진열'],
    ['interior-4', '장비 착용 공간'], ['interior-5', '스키복 의류 코너'], ['interior-6', '스노보드 바인딩'],
  ],
};

// ── 스키장·타임(6월 18일 수정요청 엑셀 = 예약 폼 기준) ──
// 매장 방문 시간(예약 폼 필수) — 영업시간 08:00~23:00 안에서 30분 단위
export const VISIT_TIMES = Array.from({ length: 30 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
export const RESORTS = [
  { id: 'yongpyong', name: '용평스키장', short: '용평', grooming: '16:30~18:00', groomingNote: '1시간 30분 슬로프 사용 불가',
    times: [
      { id: 'pass', name: '이용권', opts: [['4시간권', ''], ['6시간권', ''], ['8시간권', '']] },
    ] },
  { id: 'alpensia', name: '알펜시아스키장', short: '알펜시아', grooming: '17:00~18:30', groomingNote: '1시간 30분 슬로프 사용 불가',
    times: [
      { id: 't1', name: '1타임', opts: [['오전', '09:00~13:00'], ['오후', '13:00~17:00'], ['야간', '18:30~21:30']] },
      { id: 't2', name: '2타임', opts: [['주간', '09:00~17:00'], ['후야', '13:00~21:30']] },
    ] },
];

// ── 리프트권(26/27시즌) ── 업체 엑셀 「뽀드득 용평&알펜시아권 예약특별 할인가」(2026-11-23)
//   용평: 비수기(개장일~12/4, 3/2~폐장일) 약 45% · 성수기(12/5~3/1) 약 33% — 이용 1일 전까지 예약 시. seasons[i] 와 adult/child[i] 가 짝
//   알펜시아: 대인·소인 구분 없는 균일 특별할인가(약 40%) — 이용 1일 전까지 예약 시
//   ※ 알펜시아 야간 소인은 정상가(35,000원)가 균일가(35,500원)보다 낮아 정상가로 적음(업체 확인 필요)
export const LIFT = ov('lift', [
  { id: 'yongpyong', rev: PRICE_REV, title: '26/27시즌 용평리조트 리프트권', resort: '용평리조트', badge: '45%', cond: '이용 1일 전까지 예약 시',
    note: '뽀드득 예약 특별할인가는 이용 1일 전까지 예약하신 분께 적용됩니다. 비수기는 정상가 대비 약 45%, 성수기는 약 33% 할인된 금액입니다.',
    seasons: ['비수기', '성수기'], periods: ['개장일~12월 4일 · 3월 2일~폐장일', '12월 5일~3월 1일'],
    rows: [
      { time: '4시간권', detail: [], adult: [[79000, 44000], [79000, 53000]], child: [[69000, 38000], [69000, 46000]] },
      { time: '6시간권', detail: [], adult: [[89000, 49000], [89000, 60000]], child: [[79000, 44000], [79000, 53000]] },
      { time: '8시간권', detail: [], adult: [[99000, 55000], [99000, 66000]], child: [[89000, 49000], [89000, 60000]] },
    ] },
  { id: 'alpensia', rev: PRICE_REV, title: '26/27시즌 알펜시아리조트 리프트권', resort: '알펜시아리조트', badge: '40%', cond: '이용 1일 전까지 예약 시', flat: true,
    note: '뽀드득 예약 특별할인가는 이용 1일 전까지 예약하신 분께 적용되며, 대인·소인 구분 없이 같은 균일가입니다.',
    seasons: ['대인·소인 균일'], periods: [''],
    rows: [
      { time: '오전', detail: ['09:00~13:00'], adult: [[59000, 35500]], child: [[48000, 35500]] },
      { time: '오후', detail: ['13:00~17:00'], adult: [[59000, 35500]], child: [[48000, 35500]] },
      { time: '야간', detail: ['18:30~21:30'], adult: [[46000, 35500]], child: [[35000, 35000]] },
      { time: '주간', detail: ['09:00~17:00'], adult: [[76000, 46000]], child: [[57000, 46000]] },
      { time: '후야', detail: ['13:00~21:30'], adult: [[76000, 46000]], child: [[57000, 46000]] },
    ] },
]);
// 할인율(시즌별, 대인·소인 평균 반올림) — 배너·FAQ·제목 문구에 쓴다
const offPct = ([a, b]) => a && b ? (1 - b / a) * 100 : null;
export const liftSeasonPct = l => l.seasons.map((_, i) => { const v = l.rows.flatMap(r => [r.adult[i], r.child[i]]).map(offPct).filter(x => x != null && x > 0); return v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length) : 0; });
export const LIFT_Y = LIFT.find(l => l.id === 'yongpyong') || LIFT[0];
export const LIFT_A = LIFT.find(l => l.id === 'alpensia');
// "비수기 약 45% · 성수기 약 33%" / "약 40%"
export const liftPctText = l => l.seasons.length > 1 ? l.seasons.map((s, i) => `${s} 약 ${liftSeasonPct(l)[i]}%`).join(' · ') : `약 ${(l.badge || liftSeasonPct(l)[0] + '%').replace(/^약\s*/, '')}`;

// ── 렌탈(26/27시즌, 업체 엑셀 '렌탈요금표' 2026-11-16) ── 스키장마다 이용권 구간이 달라 표가 따로 — [정상가, 예약할인가]
export const RENTAL_COLS = ['4시간권', '6시간권', '8시간권'];   // 용평(첫 번째 표) — 예전 코드 호환용
export const RENTAL = ov('rental', {
  rev: PRICE_REV,   // 업체 엑셀 '렌탈요금표' 2026-11-23: 초급자 스키 & 보드 25,000/20,000 · 30,000/25,000 · 35,000/30,000
  cols: ['4시간권', '6시간권', '8시간권'],
  groups: [
    { group: '프리미엄 장비', key: 'gear', items: [
      { name: '프리미엄 초급자 스키 & 보드', sub: '100% 새제품 · 26/27시즌', p: [[25000, 20000], [30000, 25000], [35000, 30000]] },
      { name: '프리미엄 중급자 스키 & 보드', sub: '100% 새제품 · 26/27시즌', p: [[30000, 25000], [35000, 30000], [40000, 35000]] },
      { name: '프리미엄 숏스키 & 블레이드 & 인라인스키', sub: '100% 새제품 · 26/27시즌', p: [[30000, 25000], [35000, 30000], [40000, 35000]] },
    ] },
    { group: '하이엔드 장비', key: 'high', items: [
      { name: '하이엔드 보드 버튼 스텝온', sub: '100% 새제품 · 26/27시즌', p: [[50000, 40000], [60000, 50000], [70000, 60000]] },
      { name: '하이엔드 상급자 스키 & 보드', sub: '데모 모델 스키 · 우드해머 데크', p: [[50000, 40000], [60000, 50000], [70000, 60000]] },
      { name: '하이엔드 최상급자 스키 & 보드', sub: '월드컵 모델 · FIS 선수용 스키 · 카본 100% 해머 데크', p: [[70000, 60000], [80000, 70000], [90000, 80000]] },
    ] },
    { group: '의류', key: 'wear', items: [
      { name: '프리미엄 의류', sub: '100% 새 옷 · 푸조 / F2 / 셀시우스 / 펠리체 / STL 등', p: [[30000, 20000], [35000, 25000], [40000, 30000]] },
      { name: '하이엔드 의류', sub: '100% 새 옷 · 어반그레이 / 픽고 / 온요네 데쌍트 / 팀복·데몬복 등', p: [[40000, 30000], [45000, 35000], [50000, 40000]] },
    ] },
    { group: '안전장비', key: 'safety', items: [
      { name: '바이저헬멧', sub: '헬멧 & 고글 일체형 · 100% 새제품', p: [[20000, 15000], [25000, 20000], [25000, 20000]] },
      { name: '헬멧', sub: '단품', p: [[10000, 5000], [15000, 10000], [15000, 10000]] },
      { name: '고글', sub: '단품', p: [[10000, 5000], [15000, 10000], [15000, 10000]] },
      { name: '보호대', sub: '단품', p: [[10000, 5000], [15000, 10000], [15000, 10000]] },
    ] },
  ],
});
export const RENTAL_ALP = ov('rentalAlp', {
  rev: PRICE_REV,
  cols: ['오전 · 오후 · 야간 중 택1', '주간 · 후야 중 택1'],
  colNotes: ['오전 09~13시 · 오후 13~17시 · 야간 18:30~21:30', '주간 09~17시 · 후야 13~21:30'],
  groups: [
    { group: '프리미엄 장비', key: 'gear', items: [
      { name: '프리미엄 초급자 스키 & 보드', sub: '100% 새제품 · 26/27시즌', p: [[25000, 20000], [35000, 30000]] },
      { name: '프리미엄 중급자 스키 & 보드', sub: '100% 새제품 · 26/27시즌', p: [[30000, 25000], [40000, 35000]] },
      { name: '프리미엄 숏스키 & 블레이드 & 인라인스키', sub: '100% 새제품 · 26/27시즌', p: [[30000, 25000], [40000, 35000]] },
    ] },
    { group: '하이엔드 장비', key: 'high', items: [
      { name: '하이엔드 보드 버튼 스텝온', sub: '100% 새제품 · 26/27시즌', p: [[50000, 40000], [70000, 60000]] },
      { name: '하이엔드 상급자 스키 & 보드', sub: '데모 모델 스키 · 우드해머 데크', p: [[50000, 40000], [70000, 60000]] },
      { name: '하이엔드 최상급자 스키 & 보드', sub: '월드컵 모델 · FIS 선수용 스키 · 카본 100% 해머 데크', p: [[70000, 60000], [90000, 80000]] },
    ] },
    { group: '의류', key: 'wear', items: [
      { name: '프리미엄 의류', sub: '100% 새 옷 · 푸조 / F2 / 셀시우스 / 펠리체 / STL 등', p: [[30000, 20000], [40000, 30000]] },
      { name: '하이엔드 의류', sub: '100% 새 옷 · 어반그레이 / 픽고 / 온요네 데쌍트 / 팀복·데몬복 등', p: [[40000, 30000], [50000, 40000]] },
    ] },
    { group: '안전장비', key: 'safety', items: [
      { name: '바이저헬멧', sub: '헬멧 & 고글 일체형 · 100% 새제품', p: [[20000, 15000], [25000, 20000]] },
      { name: '헬멧', sub: '단품', p: [[10000, 5000], [15000, 10000]] },
      { name: '고글', sub: '단품', p: [[10000, 5000], [15000, 10000]] },
      { name: '보호대', sub: '단품', p: [[10000, 5000], [15000, 10000]] },
    ] },
  ],
});
// rp(표, 묶음 key, 이름 정규식, 칸) → [정상가, 예약할인가] | null
export const rp = (R, key, re, col = 0) => { const it = (R.groups.find(g => g.key === key) || { items: [] }).items.find(x => re.test(x.name)); return it && it.p[col] && it.p[col][1] ? it.p[col] : null; };
export const RENTAL_FROM = Math.min(...RENTAL.groups.flatMap(g => g.key === 'gear' || g.key === 'high' ? g.items.map(it => it.p[0][1]) : []).filter(Boolean));
export const RENTALS = [
  { id: 'yongpyong', title: '26/27시즌 용평리조트 렌탈 요금', resort: '용평스키장', data: RENTAL },
  { id: 'alpensia', title: '26/27시즌 알펜시아리조트 렌탈 요금', resort: '알펜시아스키장', data: RENTAL_ALP },
];

// 예약 폼 렌탈 항목(기존 관리자 렌탈 관리 = 폼 선택지)
export const RENTAL_ITEMS = {
  // 예약 폼: 세로 = 등급, 가로 = 품목([종류(ski|board) — 사이즈표 줄 구분용, 품목명]) — 업체 수정사항(2026-11-16)
  grades: [
    ['초급자 프리미엄 신상 장비', [['ski', '초급자 스키'], ['board', '초급자 보드']]],
    ['중급자 프리미엄 신상 장비', [['ski', '중급자 스키'], ['ski', '중급자 블레이드'], ['ski', '중급자 숏스키'], ['ski', '중급자 인라인스키'], ['board', '중급자 보드']]],
    ['하이엔드 상급자 장비', [['ski', '상급자 데모스키'], ['ski', '상급자 대회전스키'], ['ski', '상급자 파우더스키'], ['board', '상급자 보드'], ['board', '상급자 우드해머']]],
    ['하이엔드 최상급자 장비', [['ski', '최상급자 월드컵스키'], ['ski', '최상급자 FIS선수용스키'], ['board', '최상급자 보드'], ['board', '최상급자 카본해머'], ['board', '최상급자 스텝온']]],
  ],
  wear: [['프리미엄 의류', ['프리미엄 의류세트', '프리미엄 상의만', '프리미엄 하의만']], ['하이엔드 의류', ['하이엔드 의류세트', '하이엔드 상의만', '하이엔드 하의만']]],
};
// 예전 코드 호환(종류별 목록)
RENTAL_ITEMS.ski = RENTAL_ITEMS.grades.flatMap(([, its]) => its.filter(([k]) => k === 'ski').map(([, n]) => n));
RENTAL_ITEMS.board = RENTAL_ITEMS.grades.flatMap(([, its]) => its.filter(([k]) => k === 'board').map(([, n]) => n));

// 메인 「뽀드득은 어떤 곳인가요?」 옆 사진(2×2, 세로) · 메인 요금표 카드 5장 · 강습 영상(유튜브) — 어드민에서 바꿈
export const HOME_PHOTOS = ov('homePhotos', [
  { img: 'about/urbangray.webp', title: '어반그레이 스키복 착용' }, { img: 'about/pkgo.webp', title: '픽고 스키복' },
  { img: 'about/skis.webp', title: '스키 장비 진열(뵐클·엘란)' }, { img: 'about/boards.webp', title: '스노보드 장비(살로몬)' },
]);
export const RATE_CARDS = ov('rateCards', [
  // 용평·알펜시아 사진: Wikimedia Commons CC BY-SA 2.0(출처는 리프트 요금 페이지 맨 아래) / 장비·의류: 업체 제공 사진(2026-11-19 요청)
  { title: '용평리프트 요금표', img: 'main/rate-yongpyong.webp' }, { title: '알펜시아리프트 요금표', img: 'main/rate-alpensia.webp' },
  { title: '장비 요금표', img: 'about/skis.webp' }, { title: '의류 요금표', img: 'about/urbangray.webp' }, { title: '보호장비 요금표', img: 'main/rate-5.webp' },
]);
export const LESSON_VIDEOS = ov('lessonVideos', []);
// 메인 첫 화면(히어로): 기본 영상 / 사진(PC 가로 + 휴대폰 세로 선택) — 어드민 「메인 화면 → 첫 화면(영상·사진)」
export const HERO = ov('hero', { mode: 'video', img: '', imgM: '', alt: '' });   // [{ id: 유튜브 영상 ID, title }]

// ── 강습 ──
export const LESSON_FEE = ov('lesson', {
  note: '저희 강습은 1:1 개인 강습과 2:1 소수 강습으로만 운영되며, 스키와 보드 강습 비용은 동일하게 적용됩니다.',
  hours: [2, 3, 4],
  rows: [{ name: '1:1 강습', p: [200000, 250000, 300000] }, { name: '2:1 강습', p: [250000, 300000, 350000] }],
  rules: ['강습 인원은 1명 또는 2명까지입니다. 3명 이상은 강습 효율이 떨어져 진행하지 않습니다.', '강습 시간은 2시간·3시간·4시간입니다. 1시간 강습은 진도에 진척이 없어 진행하지 않습니다.', '스키와 보드 강습 비용은 같습니다.'],
});
export const PROGRAM = [
  { id: 'start', name: '처음단계', lead: '스키가 처음이신 분을 위한 기본 자세와 안전 중심의 입문 과정입니다.', rows: [
    { step: '처음', skill: '스키를 처음 접함', learn: ['스키장 안전수칙 설명', '장비기능/탈부착 방법/보행/추진활주', '안전하게 넘어지고 일어나는 방법', '방향전환, 제자리 정지방법', '동행(경사면 이동방법)', '푸르그 화렌'], goal: ['눈과 친해지기', '안전하게 스키 타는 방법', '스키장비 몸에 익히기', '안전한 스키장 이용/매너'] },
  ] },
  { id: 'beginner', name: '초급단계', lead: '기초 자세를 다듬고 기술을 단계적으로 확장하여, 초급 코스 적응을 목표로 합니다.', rows: [
    { step: '단계 1', skill: '푸르그화렌 : A자 정지가 가능함', learn: ['푸루그 산돌기(응용동작)', '리프트 승하차 방법', '프루그 연속 밀기(스피드 조절)', '프루그 보겐(테일 컨트롤)'], goal: ['눈과 친해지기', '안전하게 스키 타는 방법', '스키장비 몸에 익히기', '안전한 스키장 이용/매너'], span: 3 },
    { step: '단계 2', skill: '푸르그보겐 : A자를 유지하여 한쪽 방향으로 턴이 가능함' },
    { step: '단계 3', skill: '완사면에서 프루그 보겐이 가능함' },
    { step: '단계 4', skill: '완사면에서 푸루그 턴이 가능함', learn: ['프루그 턴', '푸르그 보겐(업다운 운용)', '프루그 보겐(탑&테일 컨트롤)'], goal: ['장애물을 이용한 턴의 개념정립', '업&다운을 이용한 턴', '하체 피붓팅 익히기(앵글레이션)'] },
  ] },
  { id: 'intermediate', name: '중급단계', lead: '중급자에게 필요한 기본기 심화와 주행 감각을 강화하여, 더 안정적이고 여유로운 라이딩을 목표로 합니다.', rows: [
    { step: '단계 1', skill: '슈템후반 : 중 사면에서 슈템턴이 가능함', learn: ['11자 사활강', '사활강 상태에서 스키 넓혀 A자 만들기', '사이드 슬라이딩', '슈템 턴(후반 모으기)', '사이드 슬라이딩 턴', '슈템 턴(전반 모으기)', '사이드 슬라이딩', '패러럴턴(11자 턴)'], goal: ['기초적인 패러럴 원리 습득', '원활한 체중이동 방법 익히기', '게이트 훈련을 이용한 패러럴', '다양한 패러럴 심화동작 익히기'], span: 2 },
    { step: '단계 2', skill: '스탠다드 패러럴 : 모든 사면에서 11자 롱턴이 가능함' },
  ] },
  { id: 'advanced', name: '상급단계', lead: '상급 단계에 필요한 핵심 감각을 정리하고, 반복 훈련으로 완성도를 높이는 심화 과정입니다.', rows: [
    { step: '단계 1', skill: '카빙롱턴/숏턴 : 다양한 슬로프와 설질에서 종합활강이 가능함', learn: ['패러럴 미들턴', '패러럴 숏턴(응용동작)', '카빙턴(응용동작)', '카빙롱턴', '카빙숏턴'], goal: ['경사에 맞는 앵글레이션 익히기', '카빙턴 개념정립', '좌/우 움직임에 의한 턴 익히기', '카빙턴 심화동작 익히기'] },
  ] },
];

// 강사진(기존 관리자 '강사진 관리' 등록 이미지 = 대한스키지도자연맹 강사 자격증). 기존 이름은 '테스트 2·3'이라 이름 대신 자격으로 표기 — 확인 필요: 강사 실명·경력
export const INSTRUCTORS = ov('instructors', [
  { img: 'instructor/ksia-1.webp', cred: '대한스키지도자연맹(KSIA) 자격 강사' },
  { img: 'instructor/ksia-2.webp', cred: '대한스키지도자연맹(KSIA) 자격 강사' },
]);
export const INSTRUCTOR_LEAD = '공식 자격을 보유한 강사진이 수준별 맞춤 강습으로 안전하고 즐거운 스키를 도와드립니다.';

// ── 숙박 ── 용평리조트 콘도(기존 숙박 안내 그대로) + 알펜시아 콘도(알펜시아 홈페이지 홀리데이 인 & 스위트 객실 소개, 2026-11-20 업체 요청)
// cols: 객실 표 머리(없으면 용평 기본). rooms 칸 순서 = cols 순서. 질문 답의 요약은 rooms 의 [1](타입) [2] [4](인원)을 쓴다
const AMENITY = { appliance: 'TV / 전화기 / 냉장고 / 에어컨 / 전자렌지 / 드라이기', kitchen: '기본취사도구 일체', bath: '타월 / 비누' };
export const STAY = [
  { slug: 'tower', name: '타워 콘도', lead: '가족을 위한 최상의 선택, 다양한 편의시설이 함께 있어 더욱 편리합니다.', types: [
    { key: 'tower', label: '18타입', photos: 7, caption: '타워콘도 18타입(SOD)',
      rooms: [['온돌', 'Standard 온돌(SOD)', '103실', '원룸형(침실1, 욕실1)', '4인'], ['싱글 침대 2', 'Standard 트윈(SOT)', '64실', '원룸형(침실1, 욕실1)', '3인'], ['온돌', 'Deluxe 온돌(DOO)', '12실', '복층형(거실1, 다락방1, 욕실1)', '5인'], ['온돌', 'Garden Floor 온돌(GFO)', '10실', '원룸형(침실1, 욕실1)', '4인']],
      bedding: '온돌 객실 : 한실 침구 4채 / 트윈 객실 : 싱글 침대 2, 한실 침구 1채' } ] },
  { slug: 'villa', name: '빌라 콘도', lead: '유럽형 콘도의 장점과 동양의 편리성의 조화', types: [
    { key: 'villa28', label: '28평', photos: 9, caption: '빌라콘도 28타입',
      rooms: [['온돌', '28A타입', '149실', '침실1, 거실1, 욕실1', '4인'], ['더블 침대1', '28D타입', '104실', '침실1, 거실1, 욕실1', '4인'], ['온돌', '28P타입(펫객실)', '12실', '침실1, 거실1, 욕실1', '4인, 2견']],
      bedding: '온돌 객실 : 한실 침구 4채 / 침대 객실 : 더블 침대 1, 한실 침구 2채', pet: '방석, 배변판(1EA), 배변패드(2EA), 식기(2EA), 배변봉투(2EA), 펫 타월(2EA)' },
    { key: 'villa41', label: '41평', photos: 9, caption: '빌라콘도 41타입',
      rooms: [['온돌', '41B타입', '36실', '침실2, 거실1, 욕실2', '6인'], ['더블 침대1+온돌', '41D타입', '72실', '침실2, 거실1, 욕실2', '5인']],
      bedding: '온돌 객실 : 한실 침구 6채 / 침대 객실 : 더블 침대 1, 한실 침구 3채' },
    { key: 'villa48', label: '48평', photos: 5, caption: '빌라콘도 48타입 - 복층구조',
      rooms: [['더블 침대1+온돌', '48타입(복층)', '38실', '복층형 / 침실2, 거실1, 욕실2', '5인']], // 기존 표기 "41D타입" → 48타입 오기로 보고 정정(확인 필요)
      bedding: '더블 침대1, 한실 침구 3채' } ] },
  { slug: 'greenpia', name: '그린피아 콘도', lead: '웨스턴 스타일의 호텔형 고품격 콘도미니엄입니다.', types: [
    { key: 'greenpia25', label: '25평', photos: 5, caption: '그린피아콘도 25타입',
      rooms: [['더블 침대1', '25타입', '81실', '침실1, 거실1, 욕실1', '4인']], bedding: '더블침대1, 한실침구2채' },
    { key: 'greenpia38', label: '38평', photos: 5, caption: '그린피아콘도 38타입',
      rooms: [['더블 침대1+온돌', '38타입', '183실', '침실2, 거실1, 욕실2', '문의']], // 기존 표기 "64실인" 오기 → 확인 필요
      bedding: '더블침대1, 한실침구2채' } ] },
  { slug: 'alpensia', name: '알펜시아 콘도', resort: '알펜시아', full: '알펜시아 홀리데이 인 & 스위트', lead: '알펜시아 리조트 빌리지 안의 유럽풍 가족형 콘도미니엄, 홀리데이 인 & 스위트(총 419실)입니다.',
    cols: ['침대', '객실타입', '면적(전체/전용)', '객실구성', '투숙인원'], wifi: false,
    info: [['체크인 · 체크아웃', '15:00 · 11:00'], ['위치', '평창 알펜시아 리조트 빌리지 안(뽀드득에서 차로 약 5분)'], ['객실 수', '총 419실']],
    note: '객실 사진·정보: 알펜시아 리조트 홈페이지 「홀리데이 인 & 스위트 객실 소개」(2026-11-20 확인). 객실 배정과 요금은 문의해 주세요.',
    amenity: { appliance: '시스템에어컨 / 평면 TV / 냉장고 / 인덕션 / 전자레인지 / 커피포트 / 헤어드라이어 / 안전금고', kitchen: '머그잔, 유리컵, 식기류 일체', bath: '핸드타월 / 샴푸 / 보디클렌저 / 비누' },
    types: [
      { key: 'alp-standard', label: '스탠다드', photos: 7, caption: '알펜시아 콘도 스탠다드 · 스탠다드 온돌',
        rooms: [['퀸 침대 1', '스탠다드', '73㎡ / 48㎡', '침실1, 거실1, 욕실1', '2~3인'], ['온돌', '스탠다드 온돌', '73㎡ / 48㎡', '침실1, 거실1, 욕실1', '2~4인']],
        bedding: '스탠다드 : 퀸 침대(1530×2030) / 온돌 : 한실 침구(1100×1800)' },
      { key: 'alp-deluxe', label: '디럭스 스위트', photos: 7, caption: '알펜시아 콘도 디럭스 스위트 · 디럭스 스위트 온돌',
        rooms: [['퀸 침대 1+온돌', '디럭스 스위트', '109㎡ / 72㎡', '침실1, 온돌1, 거실1, 욕실2', '4인'], ['온돌', '디럭스 스위트 온돌', '109㎡ / 72㎡', '온돌2, 거실1, 욕실2', '4인']],
        bedding: '디럭스 스위트 : 퀸 침대, 한실 침구 / 온돌 : 한실 침구' },
      { key: 'alp-family', label: '패밀리·럭셔리 스위트', photos: 8, caption: '알펜시아 콘도 패밀리 스위트 · 럭셔리 스위트',
        rooms: [['퀸 침대 1+온돌', '패밀리 스위트', '116㎡ / 77㎡', '침실1, 온돌1, 거실1, 욕실2', '4인'], ['킹 침대 1+온돌', '럭셔리 스위트(발코니)', '128㎡ / 87㎡', '침실1, 온돌1, 거실1, 욕실2', '4인']],
        bedding: '패밀리 스위트 : 퀸 침대, 한실 침구 / 럭셔리 스위트 : 킹 침대(1830×2030), 한실 침구' },
      { key: 'alp-royal', label: '로얄 스위트', photos: 8, caption: '알펜시아 콘도 로얄 스위트 A · B',
        rooms: [['킹 침대 2+온돌', '로얄 스위트 A', '162㎡ / 107㎡', '침실2, 온돌1, 거실1, 욕실2', '6인'], ['킹·싱글 침대+온돌', '로얄 스위트 B', '162㎡ / 107㎡', '침실2, 온돌1, 거실1, 욕실2', '6인']],
        bedding: '로얄 스위트 A : 킹 침대 2, 한실 침구 / 로얄 스위트 B : 킹 침대, 싱글 침대(1200×2030), 한실 침구' } ] },
].map(s => ({ resort: '용평리조트', amenity: AMENITY, wifi: true, note: '객실 사진과 정보는 기존 홈페이지 안내를 그대로 옮겼습니다.', ...s }));

// ── 갤러리·중고장터(기존 게시판 실제 글만. "갤러리 테스트"·강사 "테스트" 제외) ──
export const GALLERY_CATS = ['의류', '장비', '장비관리', '강습'];
export const GALLERY = ov('gallery', [
  { cat: '의류', img: 'gallery/wear-urbangray.webp', title: '어반그레이 의류', date: '2026-03-18' },
  { cat: '장비', img: 'gallery/gear-volkl.webp', title: '뵐클 중급자 스키 입고', date: '2026-03-18' },
  { cat: '장비', img: 'store/interior-1.webp', title: '스키 장비 진열대', date: '2026-02-19' },
  { cat: '장비', img: 'store/interior-2.webp', title: '스키 부츠 진열', date: '2026-02-19' },
  { cat: '장비', img: 'store/interior-6.webp', title: '스노보드 바인딩', date: '2026-02-19' },
  { cat: '장비', img: 'store/interior-4.webp', title: '장비 착용 공간', date: '2026-02-19' },
  { cat: '의류', img: 'store/interior-5.webp', title: '스키복 의류 코너', date: '2026-02-19' },
  { cat: '의류', img: 'store/interior-3.webp', title: '헬멧과 고글 진열', date: '2026-02-19' },
  { cat: '의류', img: 'scene/lineup.webp', title: '어반그레이 스키복 착용', date: '2026-11-16' },
  // 장비관리·강습: 실제 매장 사진이 생기기 전까지 무료 이미지(Unsplash·Pexels 라이선스, 출처 표기 의무 없음) — 어드민 갤러리에서 바꾸면 됨
  { cat: '장비관리', img: 'gallery/stock-care-wax-block.webp', title: '스키 베이스 왁싱', date: '2026-11-16', stock: 'Unsplash' },
  { cat: '장비관리', img: 'gallery/stock-care-wax-iron.webp', title: '왁스 다림질', date: '2026-11-16', stock: 'Unsplash' },
  { cat: '장비관리', img: 'gallery/stock-care-bench.webp', title: '스키 정비 작업', date: '2026-11-16', stock: 'Unsplash' },
  { cat: '장비관리', img: 'gallery/stock-care-boots.webp', title: '부츠·장비 보관', date: '2026-11-16', stock: 'Unsplash' },
  { cat: '강습', img: 'scene/group.webp', title: '스키장 슬로프', date: '2026-11-16' },
  { cat: '강습', img: 'scene/carve.webp', title: '카빙 턴 연습', date: '2026-11-16' },
  { cat: '강습', img: 'gallery/stock-lesson-child.webp', title: '어린이 자세 교정', date: '2026-11-16', stock: 'Pexels' },
  { cat: '강습', img: 'gallery/stock-lesson-kids.webp', title: '어린이 단체 강습', date: '2026-11-16', stock: 'Pexels' },
]);
export const USED = ov('used', [
  { img: 'gallery/used-head.webp', title: '중고 스키 15만원', body: '해당 상품 15만원입니다. 현재 2대 있습니다.', price: 150000, qty: 2, date: '2026-03-25' },
]);
export const NOTICES = ov('notices', [
  { id: 'open', date: '2026-02-19', title: '홈페이지가 새롭게 오픈되었습니다.', body: ['안녕하세요.', '홈페이지가 새롭게 오픈되었습니다.', '많은 관심부탁드립니다.', '감사합니다.'] },
]);

export const PRIVACY = {
  short: '뽀드득은 견적/예약 이외의 어떠한 용도로도 전화번호를 수집하지 않습니다.',
  items: [['정보수집의 이용 목적', '상담 및 진행'], ['수집/이용 항목', '이름, 연락처, 이용날짜, 이용시간, 렌탈물품, 강습 내용, 요청사항'], ['보유 및 이용기간', '상담 종료후 6개월, 정보제공자의 삭제 요청시 즉시'], ['개인정보처리담당', '전화 033-336-9884']],
};

// ── 자주 묻는 질문(기존 사이트에 있는 사실로만 작성) ──
const won = n => n.toLocaleString('ko-KR') + '원';
// 금액이 든 답은 요금 데이터에서 만든다(어드민에서 요금을 고치면 같이 바뀜)
const FAQ_A = (() => {
  const Y = LIFT_Y, A = LIFT_A, yp = liftSeasonPct(Y);
  const y4 = Y.rows[0];
  const ys = Y.seasons.length > 1
    ? `비수기(${Y.periods?.[0] || ''}) 약 ${yp[0]}%, 성수기(${Y.periods?.[1] || ''}) 약 ${yp[1]}% 특별할인가가 적용됩니다. 대인 4시간권 기준 정상가 ${won(y4.adult[0][0])} → 비수기 ${won(y4.adult[0][1])}, 성수기 ${won(y4.adult[1][1])}입니다.`
    : `정상가 대비 약 ${yp[0]}% 특별할인가가 적용됩니다. 대인 4시간권 기준 ${won(y4.adult[0][0])} → ${won(y4.adult[0][1])}입니다.`;
  const a1 = A && !A.pending && A.rows[0], a2 = A && !A.pending && A.rows.find(r => /주간/.test(r.time));
  const as = !A || A.pending ? `알펜시아리조트 리프트권 요금은 리조트 공지 후 안내해 드립니다.`
    : `알펜시아리조트 리프트권은 ${A.flat ? '대인·소인 구분 없이 ' : ''}오전·오후 ${won(a1.adult[0][1])}${a2 ? `, 주간·후야 ${won(a2.adult[0][1])}` : ''} 특별할인가입니다(이용 1일 전까지 예약).`;
  const b = rp(RENTAL, 'gear', /초급/), m = rp(RENTAL, 'gear', /중급/), h = rp(RENTAL, 'high', /스텝온|상급자/), t = rp(RENTAL, 'high', /최상급/), ab = rp(RENTAL_ALP, 'gear', /초급/);
  const b6 = rp(RENTAL, 'gear', /초급/, 1), b8 = rp(RENTAL, 'gear', /초급/, 2);
  const rental = [b && `용평리조트 기준 프리미엄 초급자 스키·보드는 4시간권 예약할인가 ${won(b[1])}(정상가 ${won(b[0])})${b6 ? `, 6시간권 ${won(b6[1])}` : ''}${b8 ? `, 8시간권 ${won(b8[1])}` : ''}입니다.`,
    [m && `중급자 ${won(m[1])}~`, h && `하이엔드 상급자·버튼 스텝온 ${won(h[1])}~`, t && `최상급자 ${won(t[1])}~`].filter(Boolean).join(', ') + '입니다(4시간권 예약할인가).',
    ab && `알펜시아는 오전·오후·야간 중 택1 기준 초급자 ${won(ab[1])}부터입니다.`].filter(Boolean).join(' ');
  return { lift: `용평리조트 리프트권은 이용 1일 전까지 뽀드득에 예약하시면 ${ys} ${as}`, rental };
})();
const FAQ_OLD = {"lift":"용평리조트 리프트권은 이용 1일 전까지 뽀드득에 예약하시면 정상가 대비 약 33% 특별할인가가 적용됩니다. 대인 기준 4시간권 79,000원 → 53,000원, 6시간권 89,000원 → 60,000원, 8시간권 99,000원 → 66,000원입니다. 알펜시아리조트 26/27시즌 요금은 리조트 공지 후 안내해 드립니다.","rental":"용평리조트 기준 프리미엄 초급자 스키·보드는 4시간권 예약할인가 15,000원(정상가 20,000원), 6시간권 20,000원, 8시간권 25,000원입니다. 중급자 25,000원~, 하이엔드 상급자·버튼 스텝온 40,000원~, 최상급자 60,000원~입니다(4시간권 예약할인가). 알펜시아는 오전·오후·야간 중 택1 기준 같은 금액부터입니다."};
export const FAQ = ov('faq', [
  { q: '뽀드득은 어디에 있나요?', a: `${SITE.address.full}(지번 ${SITE.address.old})에 있습니다. ${SITE.near} 거리입니다. 대표전화는 ${SITE.phone}입니다.`, pages: ['home', 'location'] },
  { q: '겨울바라기와 같은 곳인가요?', a: '네. 뽀드득은 겨울바라기 AC가 운영하는 스키 렌탈·강습 브랜드로, 25/26 시즌부터 새 이름으로 운영하고 있습니다.', pages: ['home', 'about'] },
  { q: '리프트권은 얼마나 할인되나요?', a: FAQ_A.lift, pages: ['home', 'lift'] },
  { q: '이용권(타임)은 어떻게 나뉘나요?', a: '용평스키장은 26/27시즌부터 4시간권·6시간권·8시간권으로 이용합니다. 알펜시아스키장은 1타임(오전 09:00~13:00·오후 13:00~17:00·야간 18:30~21:30 중 택1)과 2타임(주간 09:00~17:00·후야 13:00~21:30 중 택1)으로 나뉩니다.', pages: ['lift', 'reserve'] },
  { q: '정설시간에는 스키를 탈 수 없나요?', a: '네. 정설시간에는 슬로프를 사용할 수 없습니다. 용평스키장은 16:30~18:00, 알펜시아스키장은 17:00~18:30입니다(각 1시간 30분).', pages: ['home', 'lift', 'reserve'] },
  { q: '스키 강습 요금은 얼마인가요?', a: `1:1 강습은 2시간 ${won(200000)}, 3시간 ${won(250000)}, 4시간 ${won(300000)}입니다. 2:1 강습은 2시간 ${won(250000)}, 3시간 ${won(300000)}, 4시간 ${won(350000)}입니다. 스키와 보드 강습 비용은 같습니다.`, pages: ['home', 'lesson'] },
  { q: '강습은 몇 명까지, 몇 시간부터 받을 수 있나요?', a: '1:1 개인 강습과 2:1 소수 강습만 운영합니다. 3명 이상은 강습 효율이 떨어져 진행하지 않습니다. 강습 시간은 2·3·4시간이며 1시간 강습은 진행하지 않습니다.', pages: ['lesson', 'reserve'] },
  { q: '스키 처음인데 어떤 강습을 받나요?', a: '처음단계에서 스키장 안전수칙, 장비 탈부착과 보행, 안전하게 넘어지고 일어나는 법, 방향전환과 정지, 푸르그 화렌(A자 정지)까지 배웁니다. 이후 초급·중급·상급 단계로 이어집니다.', pages: ['lesson'] },
  { q: '장비 렌탈 요금은 얼마인가요?', a: FAQ_A.rental, pages: ['home', 'rental'] },
  { q: '스키복도 빌릴 수 있나요?', a: `네. 100% 새 옷으로 준비합니다. 프리미엄 의류는 4시간권 예약할인가 ${won(20000)}, 하이엔드 의류는 ${won(30000)}입니다. 헬멧·고글·보호대는 단품 ${won(5000)}, 바이저헬멧(헬멧·고글 일체형)은 ${won(15000)}입니다(용평 4시간권 기준).`, pages: ['rental'] },
  { q: '예약은 어떻게 하나요?', a: `홈페이지 예약하기·견적문의에서 날짜, 스키장, 이용타임, 렌탈 품목, 강습을 고른 뒤 접수하거나 ${SITE.phone}로 전화해 주세요. 리프트권 할인은 이용 1일 전까지 전화 예약이 필요합니다.`, pages: ['home', 'reserve'] },
  { q: '매장 규모는 어느 정도인가요?', a: `${SCALE.gear}, ${SCALE.wear}를 보유하고 있고 ${SCALE.staff}이 강습을 맡습니다.`, pages: ['about'] },
]).map(f => f.a === FAQ_OLD.lift ? { ...f, a: FAQ_A.lift } : f.a === FAQ_OLD.rental ? { ...f, a: FAQ_A.rental } : f);

// 검색어 → 답하는 페이지(llms.txt)
export const KEYWORDS = [
  ['용평렌탈샵·용평리조트렌탈샵', 'rates/rental/'], ['용평스키장 렌탈 요금', 'rates/rental/'], ['알펜시아렌탈샵', 'rates/rental/'], ['용평 리프트권 할인', 'rates/lift/'], ['알펜시아 리프트권 할인', 'rates/lift/'],
  ['용평 스키 강습 요금', 'lesson/'], ['스키 강습 단계(처음·초급·중급·상급)', 'lesson/program/'], ['용평 콘도(타워·빌라·그린피아)', 'stay/tower/'], ['뽀드득 위치·오시는 길', 'location/'],
];

// 팝업(어드민 '팝업 관리'). 기간은 화면에서 확인(지난 팝업은 자동으로 안 보임)
export const POPUP = ov('popup', { on: false, title: '', body: '', img: '', link: '', linkText: '', from: '', to: '' });
export const FAQ_PAGES = [['home', '홈'], ['about', '소개'], ['location', '오시는 길'], ['lift', '리프트 요금'], ['rental', '렌탈 요금'], ['lesson', '강습'], ['reserve', '예약']];

// 기본정보·추적 코드(어드민 '기본정보'·'추적 코드')
D.site = { phone: SITE.phone, sms: SITE.sms, hours: SITE.hours };
D.tags = { ga4: SITE.analytics.ga4, naverWa: SITE.analytics.naver, naverVerify: SITE.analytics.naverVerify, googleVerify: SITE.analytics.googleVerify };
if (OVERRIDES.site) {
  for (const k of ['phone', 'sms', 'hours']) if (OVERRIDES.site[k] != null) SITE[k] = OVERRIDES.site[k];
  SITE.phoneHref = 'tel:' + SITE.phone.replace(/\D/g, '');
}
if (OVERRIDES.tags) {
  const t = OVERRIDES.tags;
  SITE.analytics = { ga4: process.env.GA4_ID || t.ga4 || '', naver: process.env.NAVER_WA || t.naverWa || '', naverVerify: t.naverVerify || '', googleVerify: t.googleVerify || '' };
}
export const DEFAULTS = D;

// 블로그(content/blog/*.md, 매일 09·13·18시 1편씩 — tools/blog-ai/generate.mjs + GitHub Actions)
export const BLOG = {
  name: '뽀드득 블로그', lead: '용평·알펜시아 스키 렌탈, 리프트권, 강습을 처음 준비하는 분이 묻는 질문에 현장에서 답합니다.',
  categories: ['렌탈 가이드', '리프트권·요금', '스키 강습', '스키장 이용 팁', '숙박·여행'],
  author: '뽀드득 렌탈팀',
  covers: ['scene/lineup.webp', 'scene/carve.webp', 'scene/crew.webp', 'scene/duo.webp', 'scene/group.webp', 'scene/spray.webp'],
};
