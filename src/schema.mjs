// 구조화 데이터(JSON-LD). 원시 HTML에 그대로 들어가므로 AI 크롤러가 바로 읽는다.
import { SITE, LIFT, RENTAL, RENTAL_COLS, LESSON_FEE, BRANCHES } from './data.mjs';

const ID = { org: SITE.url + '#business', site: SITE.url + '#website' };
const krw = (price, name, extra = {}) => ({ '@type': 'Offer', name, price, priceCurrency: 'KRW', ...extra });

export function business() {
  const offers = [];
  for (const l of LIFT) for (const r of l.rows) {
    offers.push(krw(r.adult[0][1], `${l.resort} 리프트권 ${r.time} 대인(뽀드득 예약가)`, { priceSpecification: { '@type': 'UnitPriceSpecification', price: r.adult[0][1], priceCurrency: 'KRW', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: r.time } } }));
    offers.push(krw(r.child[0][1], `${l.resort} 리프트권 ${r.time} 소인(뽀드득 예약가)`));
  }
  for (const g of RENTAL) for (const it of g.items) {
    const p = g.flat ? it.p[0] : it.p[0][1];
    if (p) offers.push(krw(p, `${it.name} 렌탈 (${RENTAL_COLS[0]}, 예약가)`));
  }
  for (const r of LESSON_FEE.rows) LESSON_FEE.hours.forEach((h, i) => offers.push(krw(r.p[i], `스키·보드 ${r.name} ${h}시간`)));
  return {
    '@type': ['LocalBusiness', 'SportsActivityLocation'],
    '@id': ID.org,
    name: SITE.name,
    alternateName: SITE.alt,
    keywords: '용평렌탈샵, 용평리조트렌탈샵, 용평스키장렌탈샵, 알펜시아렌탈샵, 용평스키장 렌탈',
    description: `용평렌탈샵 뽀드득 — ${SITE.address.locality} 용평스키장·알펜시아 스키·스노보드 렌탈과 강습. ${SITE.near}. 리프트권 할인 예약, 장비·의류 렌탈, 1:1·2:1 강습.`,
    url: SITE.url,
    logo: SITE.url + 'assets/img/brand/logo-1200.png',
    image: [SITE.url + 'assets/img/og-logo.jpg', SITE.url + 'assets/img/store/interior-5.webp'],
    telephone: '+82-33-336-9884',
    priceRange: '₩5,000~₩350,000',
    address: { '@type': 'PostalAddress', streetAddress: SITE.address.street, addressLocality: SITE.address.locality, addressRegion: SITE.address.region, postalCode: SITE.address.postal, addressCountry: 'KR' },
    openingHours: SITE.openingHours,
    areaServed: ['용평리조트', '모나 용평', '알펜시아리조트', '평창군 대관령면'],
    founder: { '@type': 'Person', name: SITE.ceo },
    knowsAbout: ['스키 렌탈', '스노보드 렌탈', '스키복 렌탈', '스키 강습', '리프트권 할인'],
    department: [...BRANCHES.rental.map(b => ({ '@type': 'LocalBusiness', name: `뽀드득 렌탈샵 ${b}` })), ...BRANCHES.lesson.map(b => ({ '@type': 'LocalBusiness', name: `뽀드득 강습센터 ${b}` }))],
    hasOfferCatalog: { '@type': 'OfferCatalog', name: `뽀드득 ${SITE.season} 요금`, itemListElement: offers },
  };
}
export const website = () => ({ '@type': 'WebSite', '@id': ID.site, url: SITE.url, name: SITE.name, alternateName: SITE.alt, inLanguage: 'ko-KR', publisher: { '@id': ID.org } });
export const webpage = ({ url, title, description, type = 'WebPage', image }) => ({ '@type': type, '@id': url + '#webpage', url, name: title, description, inLanguage: 'ko-KR', isPartOf: { '@id': ID.site }, about: { '@id': ID.org }, dateModified: SITE.asof, ...(image ? { primaryImageOfPage: image } : {}) });
export const breadcrumb = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) });
export const faqPage = (faqs, url) => faqs.length ? ({ '@type': 'FAQPage', '@id': url + '#faq', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) : null;
export const graph = (...nodes) => ({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
