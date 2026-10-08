// 이커머스 번들 손익 시뮬레이터(자사몰 1종)의 설정 원본.
//
// 값이 바뀌는 곳은 이 파일뿐이고, calculator.js 는 공식만, explain.js 는 문장 만들기만,
// index.html 은 그리기만 한다.
//
// **defaults 는 전부 가상 예시값이다.** 실제 상품·고객사의 숫자가 아니다. 대면 미팅에서
// 바로 보여주기 위해 미리 채워 두었고, 화면에도 "가상 예시"라고 표시한다. 실제 원가나
// 마진을 이 파일에 넣지 않는다(공개 저장소).
//
// **thresholds 는 뷰리드 기획 기준값**(사용자 시트 「이커머스 사전 계산 시스템」의
// 5대 불문율 중 제1·제3법칙)이다. 시장 표준이나 실측치가 아니므로 화면에서 고객 상황에
// 맞게 바꿀 수 있게 열어 둔다.
//
// **glossary 는 화면에 나오는 말의 쉬운 풀이**다. 읽는 사람은 마케팅 용어를 모르는 사업주와 입문
// 마케터이고, 고등학생도 이해할 수 있는 수준을 기준으로 하되 **짧게** 쓴다(2026-10-08 사용자 피드백:
// 너무 자세하면 현장에서 오히려 효율이 떨어진다). 규칙:
// - 모든 항목: plain(쉬운 말, 크게) + pro(전문용어, 작게 병기) + short(한 줄 풀이). 입력 칸 힌트와 표 이름에 쓴다.
// - glossaryOrder 에 있는 항목만 ⓘ 와 아래 「용어 풀이」 목록에 나온다. 거기서는 short 를 기본으로,
//   핵심 몇 개만 example 한 줄, 오해하면 틀리는 곳에만 caution 을 둔다. 긴 설명(detail)은 두지 않는다.
// - plain·short·example·caution 에는 전문용어(CM1·ROAS·CPA·PG·VAT·공헌이익 같은 말)를 쓰지 않는다.
// - example 의 숫자는 glossaryExample 입력으로 계산한 값과 같다. 어긋나면 테스트가 잡는다.
window.ECOMMERCE_ECONOMICS_CONFIG = Object.freeze({
  // 화면 입력의 가상 예시값. 모든 금액은 부가세(VAT)를 포함한 금액이다(2026-10-08 사용자 결정).
  // 판매가·상품값·물류비는 가격표·영수증에 보이는 그대로, 광고비는 광고 관리자 숫자의 부가세 포함 여부를
  // 먼저 확인해 부가세 포함 금액으로 맞춰 넣는다. 부가세를 따로 빼는 환산은 하지 않는다. 그래서 vatRate 설정도 없다.
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
  // plainLabel 은 화면에 크게, proLabel 은 작게 병기한다.
  bundles: Object.freeze([
    Object.freeze({ id: "single", label: "단품 (1개)", plainLabel: "1개만 판매", proLabel: "단품", paidQty: 1, freeQty: 0 }),
    Object.freeze({ id: "b1p1", label: "1+1 (2개)", plainLabel: "1개 사면 1개 더 (총 2개)", proLabel: "1+1", paidQty: 1, freeQty: 1 }),
    Object.freeze({ id: "b2p1", label: "2+1 (3개)", plainLabel: "2개 사면 1개 더 (총 3개)", proLabel: "2+1", paidQty: 2, freeQty: 1 }),
    Object.freeze({ id: "b3p1", label: "3+1 (4개)", plainLabel: "3개 사면 1개 더 (총 4개)", proLabel: "3+1", paidQty: 3, freeQty: 1 }),
    Object.freeze({ id: "b4p1", label: "4+1 (5개)", plainLabel: "4개 사면 1개 더 (총 5개)", proLabel: "4+1", paidQty: 4, freeQty: 1 })
  ]),

  // 용어 풀이의 예시 계산에 쓰는 입력. 10,000원(부가세 포함)짜리 물건 하나로 모든 예시를 맞춘다.
  // 고등학생이 암산으로 따라갈 수 있게 일부러 단순한 숫자를 썼다.
  glossaryExample: Object.freeze({
    unitPrice: 10000,
    unitCogs: 2000,
    shippingPerBox: 2500,
    pgRatePercent: 3,
    cpa: 3000,
    targetMinMargin: 1000
  }),

  // ⓘ 와 「용어 풀이」 목록에 나오는 항목(이 순서대로). 나머지는 이름·힌트로만 쓰이고 ⓘ 가 없다.
  glossaryOrder: Object.freeze([
    "vatPrice", "pg", "cm1", "cm1Rate", "beRoas", "maxCpa", "cpa", "finalMargin", "bundle", "rule1", "rule3"
  ]),

  glossary: Object.freeze({
    vatPrice: Object.freeze({
      plain: "손님이 내는 금액 (부가세 포함)",
      pro: "판매가 · 결제금액 (VAT 포함)",
      short: "가격표에 붙은 가격이에요. 가격표·영수증에 보이는 부가세 포함 금액을 그대로 넣으세요.",
      caution: "부가세를 따로 빼지 않아서, 남는 돈이 대체로 약 10% 크게 나와요."
    }),
    cogs: Object.freeze({
      plain: "상품값 (물건에 든 돈)",
      pro: "원가 (COGS)",
      short: "물건 1개를 만들거나 사 오는 데 든 돈이에요. 영수증 금액 그대로(부가세 포함) 넣어요."
    }),
    shipping: Object.freeze({
      plain: "박스 1개당 택배·포장비",
      pro: "물류비",
      short: "상자에 담아 보내는 데 드는 돈이에요. 박스에 몇 개를 담아도 같다고 보고, 영수증 금액 그대로 넣어요."
    }),
    pg: Object.freeze({
      plain: "카드·결제 수수료",
      pro: "PG 수수료",
      short: "결제를 대신 처리해 주는 회사에 내는 수수료예요. 결제금액에 %를 곱해요."
    }),
    cm1: Object.freeze({
      plain: "광고비 쓰기 전에 남는 돈",
      pro: "광고 전 공헌이익 (CM1)",
      short: "광고비를 쓰기 전에 손에 남는 돈이에요. 손님이 낸 금액에서 상품값·카드 수수료·택배·포장비를 뺀 값이에요.",
      example: "예) 10,000원짜리, 상품값 2,000원, 카드 수수료 300원, 택배·포장비 2,500원이면 5,200원이 남아요.",
      caution: "광고비를 내고도 남아야 진짜 이익이지만, 인건비·임대료 같은 고정비를 아직 빼지 않았으니 순이익은 아니에요."
    }),
    cm1Rate: Object.freeze({
      plain: "100원 팔면 남는 돈",
      pro: "CM1율 (공헌이익률)",
      short: "손님이 낸 금액 100원당, 광고비 쓰기 전에 남는 돈이에요.",
      example: "예) 10,000원 중 5,200원이 남으니 100원 팔면 52원이에요 (52.0%)."
    }),
    beRoas: Object.freeze({
      plain: "본전 되는 광고 효율",
      pro: "손익분기 ROAS",
      short: "광고비 100원을 쓸 때 결제금액이 얼마 이상 나와야 본전인지 알려줘요.",
      example: "예) 192.3%라면 광고비 100원에 결제금액 192.3원 이상이 들어와야 본전이에요 (10,000원 ÷ 5,200원).",
      caution: "플랫폼마다 매출을 세는 방식과 광고비의 부가세 포함 여부가 달라요. 광고 관리자 숫자는 기준부터 확인하세요."
    }),
    maxCpa: Object.freeze({
      plain: "주문 1건에 쓸 수 있는 최대 광고비",
      pro: "한계 CPA",
      short: "이 금액까지는 써도 본전이고, 넘으면 손해예요. 광고비 쓰기 전에 남는 돈에서 최소한 남기고 싶은 돈을 뺀 값이에요.",
      example: "예) 남는 돈이 5,200원이면 최대 5,200원이고, 1,000원은 남기고 싶다면 4,200원이에요.",
      caution: "첫 구매 기준이에요. 같은 손님이 다시 사 주는 것(재구매)은 계산에 넣지 않았어요."
    }),
    cpa: Object.freeze({
      plain: "주문 1건당 광고비",
      pro: "광고 CPA",
      short: "광고비를 주문 건수로 나눈 값이에요. 부가세 포함 금액으로 넣고, 광고 관리자 숫자는 플랫폼마다 부가세 포함 여부가 달라서 먼저 확인하세요.",
      example: "예) 광고비 30만 원으로 주문이 100건이면 주문 1건당 3,000원이에요."
    }),
    finalMargin: Object.freeze({
      plain: "광고비까지 쓰고 남는 돈",
      pro: "최종 마진 (CM1 − CPA)",
      short: "남는 돈에서 주문 1건당 광고비를 뺀 값이에요. 마이너스면 팔수록 손해예요."
    }),
    targetMin: Object.freeze({
      plain: "최소한 남기고 싶은 돈",
      pro: "목표 최소 마진",
      short: "이만큼은 꼭 남기고 싶다는 금액이에요. 0이면 본전까지 광고비를 써도 된다고 봐요."
    }),
    bundle: Object.freeze({
      plain: "묶음 구성",
      pro: "번들 (1+1, 2+1 …)",
      short: "여러 개를 묶어서 파는 방식이에요. '2+1'은 2개 값을 받고 1개를 덤으로 줘서 총 3개를 보내요. 덤도 상품값은 들어요.",
      example: "예) 10,000원짜리 2+1이면 손님은 20,000원을 내고 3개를 받아요. 상품값은 3개분인 6,000원이에요."
    }),
    discountRate: Object.freeze({
      plain: "사실상 할인율",
      pro: "실질 할인율",
      short: "덤으로 주는 개수가 총 개수에서 차지하는 비율이에요. 2+1이면 1÷3로 33.3%예요."
    }),
    cogsRate: Object.freeze({
      plain: "손님이 낸 금액 중 상품값 비중",
      pro: "원가율",
      short: "손님이 낸 금액 중 상품값이 차지하는 비율이에요. 높을수록 남는 돈이 적어요."
    }),
    shippingPerUnit: Object.freeze({
      plain: "1개당 택배·포장비",
      pro: "개당 배송비 부담액",
      short: "박스 1개 택배·포장비를 들어 있는 개수로 나눈 값이에요. 묶음이 클수록 줄어요."
    }),
    shippingSaving: Object.freeze({
      plain: "1개씩 보낼 때보다 줄어든 택배·포장비",
      pro: "단품 대비 개당 배송비 절감",
      short: "1개씩 보낼 때보다 물건 1개당 택배·포장비가 얼마나 줄었는지예요."
    }),
    consumption: Object.freeze({
      plain: "1개 쓰는 데 걸리는 기간",
      pro: "소진 주기",
      short: "물건 1개를 다 쓰는 데 걸리는 개월 수예요. 참고용이고 기준 점검에는 쓰지 않아요."
    }),
    rule1: Object.freeze({
      plain: "점검 ① 한 번에 결제되는 금액이 충분한가",
      pro: "제1법칙 (결제금액·CM1 하한)",
      short: "한 번에 결제되는 금액이 최소선 이상이거나, 광고비 쓰기 전에 남는 돈이 최소선 이상이면 기준 충족이에요. 둘 중 하나만 넘으면 돼요."
    }),
    rule3: Object.freeze({
      plain: "점검 ② 100원 팔면 남는 돈이 충분한가",
      pro: "제3법칙 (CM1율 하한)",
      short: "100원을 팔았을 때 광고비 쓰기 전에 남는 돈이 최소선 이상이면 기준 충족이에요."
    }),
    aovFloor: Object.freeze({
      plain: "한 번에 결제되는 금액 최소선",
      pro: "결제금액 하한 (VAT 포함)",
      short: "점검 ①의 기준이에요. 손님이 한 번에 내는 금액이 이 이상이면 충족이에요."
    }),
    marginFloor: Object.freeze({
      plain: "광고비 쓰기 전에 남는 돈 최소선",
      pro: "CM1 하한 (VAT 포함)",
      short: "점검 ①의 기준이에요. 광고비 쓰기 전에 남는 돈이 이 이상이면 충족이에요."
    }),
    cm1RateFloor: Object.freeze({
      plain: "100원 팔면 남는 돈 최소선",
      pro: "CM1율 하한",
      short: "점검 ②의 기준이에요. 숫자는 %로 넣고, 남는 돈 비율이 이 이상이면 충족이에요."
    })
  })
});
