// 리드 수집 대행 보수 구조 계산기의 기준값·문구. 값과 문구를 바꿀 때는 이 파일만 고친다.
//
// 기본값이 있는 것은 사용자가 직접 정한 값뿐이다(2026-11-11).
//   - 민감도 전환율 5%·8%·12%, 비교 기준 수수료율 15%, 목표 영업이익률 25%
// 광고비·CPA·기준 전환율·수수료율·기본료율·월 운영비는 기본값이 없다 — 화면에서 직접 넣는다.
// 업종 참고 CPA 는 ../lead-cpa-guide/pricing-config.js 의 값을 그대로 읽는다(원천 한 곳).
window.LEAD_CPS_CONFIG = Object.freeze({
  defaults: Object.freeze({
    scenarioRates: Object.freeze([0.05, 0.08, 0.12]),
    referenceFeeRate: 0.15,
    targetMargin: 0.25
  }),

  structures: Object.freeze([
    Object.freeze({
      key: "flat",
      label: "기존 고정 수수료",
      tag: "비교 기준",
      scope: "광고 운영. 리드 품질 AS까지 요구받기 쉬운 구조",
      pay: "광고비 × 기준 수수료율"
    }),
    Object.freeze({
      key: "lean",
      label: "1단계 라이트 CPA",
      tag: "품질 AS 없음",
      scope: "계약서에 고정한 유효 DB 정의 충족까지. 교체·환불은 형식 하자(번호 오류·중복)만, 신고 기한과 한도 안에서",
      pay: "광고비 × 낮춘 수수료율 (월 최소 수수료 하한)"
    }),
    Object.freeze({
      key: "hybrid",
      label: "2단계 하이브리드",
      tag: "권장 기본값",
      scope: "확정 건(승인·개통)까지",
      pay: "광고비 × 기본료율 + 확정 1건당 CPS"
    }),
    Object.freeze({
      key: "cps",
      label: "3단계 순수 CPS",
      tag: "확정 수익만",
      scope: "소재·랜딩·DB 품질 전체",
      pay: "확정 1건당 CPS (월 최소 보장 선택)"
    })
  ]),

  principle: "품질 책임을 지려면 성과 보수를 받는다. 광고주가 리드 품질 AS를 요구하는 순간 이미 결과 책임을 묻는 것이므로, 보수도 결과에 연동한다. AS를 요구하지 않으면 책임 범위를 줄이고 수수료를 낮춘다.",

  safeguards: Object.freeze([
    "확정 정의를 계약서에 고정한다. 대출은 승인인지 실행인지, 인터넷은 개통인지 유지기간 충족인지.",
    "감사권. CRM 상태값 읽기 접근, 또는 월 정산 때 콜로그·상태 목록 대조.",
    "환수(클로백) 범위. 개통 후 해지 시 보수를 어디까지, 몇 개월까지 돌려줄지.",
    "광고비 선지출 주체. 이 계산기는 광고비를 광고주가 부담한다고 가정한다.",
    "정산 주기와 현금흐름. 확정까지 시차가 있으니 기본료나 월 중간 선정산을 둔다."
  ]),

  // 가상 예시(구조 확인용). 실제 광고주 수치가 아니다.
  example: Object.freeze({
    spend: 30000000,
    cpa: 33000,
    baseRate: 0.08,
    leanRate: 0.08,
    hybridBaseRate: 0.05,
    ops: 3000000
  })
});
