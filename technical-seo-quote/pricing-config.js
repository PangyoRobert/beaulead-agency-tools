// 원본: 구글 시트 「250204_Technical SEO 작업 견적서_초안_」(작성일 2026-01-15, 초안) 4개 탭.
// 금액·시간·문구는 시트 값을 그대로 옮긴 것이다. 임의로 만든 수치는 없다.
// 시간당 단가와 1MM 산정 가정은 공개 저장소에 두지 않는다(2026-10-06 결정). 항목별 시간·비용·합계만 둔다.
window.TECHNICAL_SEO_QUOTE_CONFIG = Object.freeze({
  version: "시트 작성일 2026-01-15",
  inclusions: ["핵심 작업 실행 시간 (70%)", "클라이언트 커뮤니케이션 (15%)", "QA 및 재검토 (15%)"],
  exclusions: ["사이트 접근 권한 지연으로 인한 대기 시간", "3회 이상의 수정 요청 (추가 비용 발생)", "사이트 구조 대폭 변경 등 스코프 변경 사항"],
  riskBuffer: ["표준 견적: 20% 버퍼 포함 (예상치 못한 이슈 대비)", "최대 견적: 40% 버퍼 포함 (복잡한 레거시 코드, 긴급 대응)"],
  costDrivers: [
    "웹사이트 페이지 수 및 URL 구조 복잡성",
    "제품 카탈로그(SKU) 수량",
    "필터/지역별 동적 페이지 생성 여부",
    "기존 기술적 이슈 수준 (크롤링 오류, 속도, 모바일 최적화)",
    "경쟁 분석 및 키워드 리서치 깊이"
  ],
  // 시트의 「가격 범위」. 값이 null 이면 시트가 비어 있다는 뜻이고 화면에는 "별도 협의"로 표시한다.
  // 「투입 인원별 가격」 설명 문구. 시트의 라벨(1명 시니어 / 2명 시니어+주니어 / 3명 시니어1+주니어2)을 풀어 쓴 것이다.
  teamGuide: {
    intro: "같은 작업을 몇 명이 나눠서 하느냐에 따라 가격과 걸리는 기간이 달라집니다. 사람이 많아질수록 더 빨리 끝나는 대신 가격은 올라갑니다.",
    glossary: ["시니어: 경력이 많은 전문가", "주니어: 경력이 적은 담당자 (시니어와 함께 작업을 나눠 맡습니다)"],
    teams: {
      1: { title: "혼자 맡기", who: "시니어 1명이 처음부터 끝까지 합니다." },
      2: { title: "둘이 나눠 맡기", who: "시니어 1명과 주니어 1명이 나눠서 합니다." },
      3: { title: "셋이 나눠 맡기", who: "시니어 1명과 주니어 2명이 나눠서 합니다." }
    }
  },
  tiers: [
    {
      id: "small",
      name: "소형 사이트",
      pages: "1-10 페이지",
      cases: ["랜딩페이지", "소규모 프로모션 사이트", "개인 포트폴리오"],
      complexity: "낮음 (기본 SEO 체크리스트 적용)",
      duration: "3~4주",
      teamPrices: { 1: 3000000, 2: 3900000, 3: null },
      teamMonths: null,
      totalHours: 120,
      totalCost: 3000000,
      items: [
        { name: "Technical Audit", summary: "크롤링 오류, 속도, 모바일 최적화 분석", hours: 25, cost: 625000, tasks: ["GSC 크롤링 통계 확인 및 오류 페이지 식별", "PageSpeed Insights 주요 지표 (LCP/FID/CLS) 측정", "모바일 뷰포트 설정 및 반응형 디자인 검토", "핵심 랜딩 페이지 로딩 속도 최적화 방안 도출"] },
        { name: "On-Page SEO", summary: "메타태그, 헤더구조, 내부링크 최적화", hours: 20, cost: 500000, tasks: ["Title/Meta Description 누락/중복 검토 및 수정", "H1-H6 헤더 태그 계층 구조 점검 및 수정", "핵심 키워드 기반 내부링크 앵커 텍스트 최적화", "깨진 링크(Broken Link) 점검 및 수정"] },
        { name: "Schema Markup", summary: "기본 구조화 데이터 (Organization, WebPage)", hours: 10, cost: 250000, tasks: ["Organization 스키마 마크업 생성 및 삽입", "WebPage 스키마 마크업 생성 및 삽입", "스키마 마크업 유효성 테스트"] },
        { name: "Image Optimization", summary: "ALT 태그, 파일명, 압축 최적화", hours: 20, cost: 500000, tasks: ["이미지 Alt 태그 누락분 일괄 보완", "이미지 파일명 SEO 친화적으로 변경 (키워드 포함)", "이미지 압축 툴을 사용하여 용량 최적화"] },
        { name: "Sitemap & Robots.txt", summary: "XML 사이트맵 생성 및 robots.txt 설정", hours: 5, cost: 125000, tasks: ["최신 XML 사이트맵 생성 및 GSC 등록", "robots.txt 파일 검토 및 불필요한 크롤링 차단 설정", "GSC에서 사이트맵 정상 처리 여부 모니터링"] },
        { name: "Google Search Console", summary: "GSC 설정 및 초기 모니터링", hours: 10, cost: 250000, tasks: ["Google Search Console 도메인 속성 등록", "GSC의 색인 범위 보고서 초기 데이터 분석", "GSC 핵심 지표 (클릭수, 노출수) 모니터링 및 트렌드 파악"] },
        { name: "Basic Keyword Research", summary: "타겟 키워드 5-10개 선정", hours: 20, cost: 500000, tasks: ["주요 서비스/제품 관련 타겟 키워드 5-10개 선정", "경쟁사 키워드 활용 사례 분석", "선정된 키워드별 검색 의도(Intent) 분류", "키워드-콘텐츠 매핑 전략 초안 작성"] },
        { name: "Implementation Report", summary: "작업 보고서 및 권장사항 문서화", hours: 10, cost: 250000, tasks: ["작업 항목별 변경 전/후 상세 내역 기록", "발견된 문제점 및 권장 사항 문서화", "프로젝트 완료 후 인수인계 및 Q&A 준비"] }
      ]
    },
    {
      id: "medium",
      name: "중형 사이트",
      pages: "10-50 페이지",
      cases: ["병의원", "회사 소개 사이트", "SKU 10개 이하 이커머스", "단일 필터 중개플랫폼"],
      complexity: "중간 (다중 페이지 유형, 기본 동적 콘텐츠)",
      duration: "9주 ~ 12주",
      teamPrices: { 1: 9875000, 2: 12837500, 3: 14812500 },
      teamMonths: { 1: "2.35", 2: "1.17", 3: "0.78" },
      totalHours: 395,
      totalCost: 9875000,
      items: [
        { name: "Comprehensive Technical Audit", summary: "전체 사이트 크롤링, 성능 분석, 모바일 최적화", hours: 60, cost: 1500000, tasks: ["로그 파일 분석 및 크롤링 오류 진단", "PageSpeed Insights 점수 측정 및 병목 구간 식별", "모바일 뷰포트 및 터치 요소 반응성 검토", "Robots.txt 및 .htaccess 설정 검토"] },
        { name: "Advanced On-Page SEO", summary: "모든 페이지 메타태그, 헤더, 내부링크 최적화", hours: 70, cost: 1750000, tasks: ["Title Tag, Meta Description 적합성 수정", "H1-H6 헤더 태그 구조 재정렬", "핵심 페이지 간 내부링크 재배치 및 앵커 텍스트 최적화", "캐노니컬 태그(Canonical Tag) 일관성 점검"] },
        { name: "Schema Markup (Advanced)", summary: "다중 스키마 타입 (Service, Product, FAQPage 등)", hours: 25, cost: 625000, tasks: ["JSON-LD 형식의 서비스(Service) 스키마 생성 및 삽입", "상품(Product) 페이지용 스키마 데이터 구조화", "FAQPage 스키마를 FAQ 섹션에 적용", "스키마 마크업 유효성 테스트 (구조화된 데이터 테스트 도구 사용)"] },
        { name: "Content Structure", summary: "URL 구조 재설계, 카테고리 계층 최적화", hours: 40, cost: 1000000, tasks: ["SEO 친화적인 URL 구조 (SLUG) 정의 및 적용", "사이트 카테고리/하위 카테고리 Depth 재조정", "404 발생 시 리다이렉트 체인 최소화 전략 수립", "기존 콘텐츠의 계층 구조 매핑 및 이관 계획 수립"] },
        { name: "Image & Media Optimization", summary: "전체 이미지/비디오 최적화, lazy loading", hours: 20, cost: 500000, tasks: ["이미지 압축 및 WebP/AVIF 변환 적용", "이미지 Alt Tag 누락분 일괄 보완", "비디오/iframe의 지연 로딩(Lazy Loading) 설정", "불필요한 이미지 소스 제거 및 srcset 활용 검토"] },
        { name: "Site Speed Enhancement", summary: "Core Web Vitals 개선, 캐싱, CDN 설정", hours: 35, cost: 875000, tasks: ["LCP/FID/CLS 개선을 위한 스크립트 비동기 처리", "브라우저 레벨 캐싱 정책 (Cache-Control) 설정", "Cloudflare 등 CDN 도입 및 구성", "서버 응답 시간 (TTFB) 최적화"] },
        { name: "XML Sitemap (Multi-type)", summary: "다중 사이트맵 생성 (페이지, 이미지, 비디오)", hours: 15, cost: 375000, tasks: ["표준 XML 사이트맵 최신화 및 GSC 제출", "이미지 전용 사이트맵 별도 생성", "비디오 콘텐츠 사이트맵 생성 및 태그 검토", "사이트맵 파일 용량 및 최대 URL 개수 준수 여부 확인"] },
        { name: "Keyword Research", summary: "타겟 키워드 30-50개, 경쟁사 분석", hours: 40, cost: 1000000, tasks: ["핵심 키워드 30-50개 추출 및 검색 의도 분류", "경쟁사 상위 노출 페이지 분석 및 Gap 도출", "Long-tail 키워드 발굴 및 콘텐츠 주제 기획", "키워드-페이지 매칭 전략 문서화"] },
        { name: "Link Architecture", summary: "내부링크 전략, breadcrumb 최적화", hours: 20, cost: 500000, tasks: ["중요 페이지로의 내부링크 흐름 강화", "Breadcrumb 네비게이션 구조 설계 및 마크업 적용", "사일로(Silo) 구조를 위한 카테고리 페이지 링크 집중", "고아 페이지(Orphan Page) 식별 및 링크 연결"] },
        { name: "Local SEO (if applicable)", summary: "Google Business Profile, 지역 스키마", hours: 15, cost: 375000, tasks: ["Google Business Profile (GBP) 정보 최적화", "지역(Local) 스키마 마크업 구현", "NAP(이름/주소/전화번호) 정보의 웹사이트 일관성 검토", "지역 기반 타겟팅 설정 확인 (GSC)"] },
        { name: "Analytics Setup", summary: "GA4, GSC, 전환 추적 설정", hours: 30, cost: 750000, tasks: ["Google Analytics 4 (GA4) 기본 설정 및 태그 관리", "Google Search Console (GSC) 도메인 속성 등록 및 연동", "목표 (Goal) 및 전자상거래 (E-commerce) 전환 추적 구현", "맞춤 보고서 및 데이터 스튜디오(Looker Studio) 연동 준비"] },
        { name: "Comprehensive Report", summary: "상세 작업 보고서, 유지보수 가이드", hours: 25, cost: 625000, tasks: ["최종적으로 적용된 변경 사항 상세 목록 작성", "향후 SEO 유지보수 주기 및 체크리스트 가이드 문서화", "주요 지표 (KPI) 개선 결과 요약 및 시각화", "프로젝트 종료 후 Q&A 및 인수인계 문서 작성"] }
      ]
    },
    {
      id: "large",
      name: "대형 사이트",
      pages: "50+ 페이지",
      cases: ["대규모 이커머스 (SKU 50+)", "다중 필터 중개 플랫폼", "뉴스/매거진"],
      complexity: "높음 (동적 페이지, 필터링, 페이지네이션, API 통합)",
      duration: "20주 ~ 25주",
      teamPrices: { 1: null, 2: null, 3: 42140000 },
      teamMonths: { 1: "5.12", 2: "2.56", 3: "1.71" },
      totalHours: 860,
      totalCost: 30100000,
      taskRoles: ["진단/분석", "전략 수립/문서화", "실행/검증", "협업/교육"],
      items: [
        { name: "Enterprise Technical Audit", summary: "대규모 크롤링 (50+ 페이지), 심층 성능 분석", hours: 110, cost: 3850000, tasks: ["전체 URL 목록 대상 심층 크롤링 데이터 분석 (4xx/5xx/색인 오류 식별)", "대규모 크롤링 예산(Crawl Budget) 최적화 전략 및 우선순위 결정", "서버 로그 데이터를 활용한 크롤러(Bot) 접근 패턴 분석", "기술적 문제 해결을 위한 개발팀 대상 이슈 리포트 및 협의"] },
        { name: "Advanced Site Architecture", summary: "복잡한 URL 구조, 페이지네이션, 필터링 최적화", hours: 80, cost: 2800000, tasks: ["현재 URL 구조의 깊이 및 비효율적인 경로 식별 (Audit)", "페이지네이션(Page 1, 2, 3...) 및 정렬/필터링 최적화 상세 가이드라인 작성", "301/302 리다이렉션 체인 분석 및 단축을 위한 매핑표 생성", "변경된 URL 구조에 대한 기획/퍼블리싱팀 이해 교육"] },
        { name: "Comprehensive On-Page SEO", summary: "대량 페이지 최적화, 템플릿 기반 자동화", hours: 100, cost: 3500000, tasks: ["핵심 템플릿 (상품 상세, 목록 등)의 메타 태그 중복/누락 현황 분석", "대량의 Title/Description 자동 생성 및 관리(CMS)를 위한 템플릿 로직 설계", "내부링크 삽입 위치 및 앵커 텍스트 일관성 점검 및 재배치", "SEO 콘텐츠 가이드라인에 따른 콘텐츠 작성팀 대상 교육 자료 준비"] },
        { name: "Advanced Schema Implementation", summary: "Product, Offer, Review, FAQ, BreadcrumbList 등", hours: 60, cost: 2100000, tasks: ["다중 스키마 타입(제품, 리뷰 등)이 필요한 핵심 페이지 목록화", "각 스키마의 속성(Property) 정의 및 JSON-LD 스크립트 최종 설계", "스키마 마크업 삽입 후 Google 리치 결과 도구(Rich Results Test)를 통한 유효성 검증", "개발팀에 스키마 삽입 위치 및 유지보수 방법 문서 인수인계"] },
        { name: "JavaScript SEO", summary: "SPA/React/Vue 렌더링 최적화, 동적 콘텐츠 크롤링", hours: 45, cost: 1575000, tasks: ["Google Search Console에서 JavaScript 렌더링 오류 로그 분석", "클라이언트/서버 렌더링(SSR/CSR) 중 최적 렌더링 방식 선택 및 가이드라인 제시", "동적으로 로드되는 콘텐츠가 검색 엔진에 노출되는지 스크린샷 렌더링 테스트", "JS 개발팀과 협력하여 Critical CSS 및 Hydration 문제 해결"] },
        { name: "International SEO", summary: "hreflang 설정, 다국어/다지역 최적화", hours: 40, cost: 1400000, tasks: ["대상 국가별/언어별 URL 매핑 테이블 및 현재 hreflang 설정 오류 분석", "국가 타겟팅(Geo-targeting) 및 다국어 콘텐츠 노출 전략 문서화", "GSC에서 국가별 타겟팅 설정 및 hreflang 태그의 정확성 검증", "마케팅팀/현지화팀과 협력하여 언어 설정 및 콘텐츠 일관성 유지"] },
        { name: "Core Web Vitals Optimization", summary: "LCP, FID, CLS 개선, 고급 성능 최적화", hours: 60, cost: 2100000, tasks: ["LCP/FID/CLS 문제의 원인이 되는 대용량 리소스(이미지/폰트/JS) 식별", "성능 개선을 위한 캐싱 전략(브라우저/서버) 및 CDN 최적화 계획 수립", "서버/클라이언트 환경에서 TTFB(응답 시간) 최적화 방안 실행 및 결과 측정", "개발팀에 성능 최적화 작업의 우선순위 및 구현 방법 전달"] },
        { name: "Faceted Navigation SEO", summary: "필터 URL 관리, canonical 태그, noindex 전략", hours: 30, cost: 1050000, tasks: ["필터링된 URL(예: category/?color=red) 중 색인이 필요한/필요 없는 페이지 분류", "필터 조합에 따른 Canonical 태그 및 Noindex/Nofollow 적용 전략 설계", "색인되지 않아야 할 필터 페이지가 실제 robots.txt 및 메타 태그로 차단되었는지 검증", "상품 및 카테고리 관리자에게 필터링 시스템 사용 가이드 전달"] },
        { name: "Advanced Keyword Strategy", summary: "100+ 키워드, 세분화된 경쟁사 분석", hours: 60, cost: 2100000, tasks: ["100개 이상의 키워드에 대한 검색량, 경쟁도, 검색 의도(Intent) 데이터베이스 구축", "키워드 클러스터링(Grouping)을 통해 콘텐츠 및 페이지별 매핑 전략 최종 문서화", "경쟁사 상위 5개 사이트의 콘텐츠 구조 및 키워드 활용 패턴 심층 분석", "키워드 데이터를 기반으로 한 신규 콘텐츠 기획팀 브리핑"] },
        { name: "Link Equity Distribution", summary: "PageRank 흐름 최적화, 내부링크 구조 재설계", hours: 45, cost: 1575000, tasks: ["내부링크 구조 분석 툴을 사용하여 웹사이트 내 PageRank/링크 가치 흐름 진단", "핵심 페이지로 링크 가치를 집중시키기 위한 내부링크 구조 재설계 전략 수립", "중요도가 낮은 페이지에 대한 Nofollow 적용 및 링크 삭제 필요성 검토", "개발팀과 협력하여 사이드바/푸터 등 템플릿 영역의 링크 구조 수정"] },
        { name: "Advanced Sitemap Management", summary: "동적 사이트맵, 이미지/비디오/뉴스 사이트맵", hours: 25, cost: 875000, tasks: ["대규모 URL을 효율적으로 관리할 수 있는 동적 사이트맵 생성 로직 설계", "이미지, 비디오, 뉴스 등 콘텐츠 유형별 사이트맵 별도 생성 및 검토", "GSC에 다중 사이트맵을 등록하고 색인 상태 변화를 모니터링", "사이트맵 자동 업데이트 시스템의 안정성 및 오류 발생 시 대응 매뉴얼 작성"] },
        { name: "Log File Analysis", summary: "서버 로그 분석, 크롤 버짓 최적화", hours: 35, cost: 1225000, tasks: ["서버 로그 파일을 다운로드 및 분석하여 Googlebot의 크롤링 경로 및 빈도 식별", "크롤링 효율이 낮은 영역(예: 저품질 페이지)을 파악하고 차단 전략 수립", "robots.txt 수정 후 서버 로그를 재분석하여 크롤 버짓 개선 효과 측정", "개발팀/서버 관리팀과 협의하여 로그 접근 및 분석 환경 구축"] },
        { name: "API & Data Integration", summary: "GSC API, GA4 API, 데이터 대시보드", hours: 45, cost: 1575000, tasks: ["GSC API 및 GA4 API를 활용하여 필요한 데이터 지표 목록 확정", "Looker Studio 등 대시보드 툴에 API 연결 및 데이터 파이프라인 구축", "주요 SEO/KPI 지표를 한눈에 볼 수 있는 맞춤형 대시보드 템플릿 설계", "데이터 대시보드 사용법 및 보고서 해석 방법을 팀에 공유"] },
        { name: "Monitoring & Alerting", summary: "실시간 SEO 모니터링, 이슈 알림 시스템", hours: 25, cost: 875000, tasks: ["핵심 페이지의 노출 순위, 크롤링 오류 발생 시 알림 시스템 설계", "크롤러 차단, hreflang 오류 등 중대한 이슈 발생 시 실시간 알림 설정", "모니터링 시스템의 알림 기능이 정상 작동하는지 테스트 및 검증", "오류 알림 발생 시 1차 대응(Triage)을 위한 프로세스 문서화"] },
        { name: "Migration Support (if needed)", summary: "리뉴얼/마이그레이션 SEO 컨설팅", hours: 60, cost: 2100000, tasks: ["마이그레이션 대상 URL 및 콘텐츠 목록의 최종 매핑 계획 검토 및 승인", "리뉴얼 직후 301 리다이렉션이 정상 작동하는지 일련의 테스트 진행", "마이그레이션 후 1~3개월간 GSC와 GA4를 통해 트래픽 및 색인 상태 변화 집중 모니터링", "마이그레이션 중 발생 가능한 SEO 위험 요소 및 체크리스트 작성"] },
        { name: "Enterprise Report & Training", summary: "상세 보고서, 팀 교육, 유지보수 매뉴얼", hours: 40, cost: 1400000, tasks: ["프로젝트 기간 동안의 모든 작업 내용, 진단 결과, 개선 효과를 담은 최종 상세 보고서 작성", "최종 보고서를 기반으로 경영진/이해관계자 대상 요약 보고 및 성과 발표", "SEO 유지보수 작업(예: 정기 감사, 스키마 업데이트)을 위한 내부 매뉴얼 작성", "개발팀/마케팅팀 대상 SEO 지식 및 툴 활용법 심화 교육 진행"] }
      ]
    }
  ]
});
