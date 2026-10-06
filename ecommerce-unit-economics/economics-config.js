// 이커머스 번들 손익 시뮬레이터(자사몰 1종)의 설정 원본.
//
// 값이 바뀌는 곳은 이 파일뿐이고, calculator.js 는 공식만, index.html 은 그리기만 한다.
//
// **defaults 는 전부 가상 예시값이다.** 실제 상품·고객사의 숫자가 아니다. 대면 미팅에서
// 바로 보여주기 위해 미리 채워 두었고, 화면에도 "가상 예시"라고 표시한다. 실제 원가나
// 마진을 이 파일에 넣지 않는다(공개 저장소).
//
// **thresholds 는 뷰리드 기획 기준값**(사용자 시트 「이커머스 사전 계산 시스템」의
// 5대 불문율 중 제1·제3법칙)이다. 시장 표준이나 실측치가 아니므로 화면에서 고객 상황에
// 맞게 바꿀 수 있게 열어 둔다.
window.ECOMMERCE_ECONOMICS_CONFIG = Object.freeze({
  // 부가가치세율. 법정 세율이라 사업 판단값이 아니지만 코드에 박지 않고 여기에 둔다.
  vatRate: 0.1,

  // 화면 입력의 가상 예시값. 판매가는 VAT 포함, 원가·물류비는 공급가(VAT 제외).
  defaults: Object.freeze({
    unitPrice: 29900,
    unitCogs: 3000,
    shippingPerBox: 3500,
    pgRatePercent: 3,
    targetMinMargin: 0,
    consumptionMonths: 1
  }),

  // 판정 기준값. cm1RatePercent 는 % 단위로 적고 화면에서도 % 로 받는다.
  thresholds: Object.freeze({
    aovFloor: 40000,
    marginFloor: 25000,
    cm1RatePercent: 60
  }),

  // 번들 구성. 유료 수량과 무료 증정 수량만 적는다. 번들 판매가는 단품가 x 유료 수량이다.
  bundles: Object.freeze([
    Object.freeze({ id: "single", label: "단품 (1개)", paidQty: 1, freeQty: 0 }),
    Object.freeze({ id: "b1p1", label: "1+1 (2개)", paidQty: 1, freeQty: 1 }),
    Object.freeze({ id: "b2p1", label: "2+1 (3개)", paidQty: 2, freeQty: 1 }),
    Object.freeze({ id: "b3p1", label: "3+1 (4개)", paidQty: 3, freeQty: 1 }),
    Object.freeze({ id: "b4p1", label: "4+1 (5개)", paidQty: 4, freeQty: 1 })
  ])
});
