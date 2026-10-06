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
// **glossary 는 화면에 나오는 말의 쉬운 풀이**다. 읽는 사람은 마케팅 용어를 모르는 사업주와
// 입문 마케터이고, 고등학생도 이해할 수 있는 수준을 기준으로 쓴다. 규칙:
// - plain(쉬운 말)에는 전문용어(CM1·ROAS·CPA·PG·VAT·공헌이익 같은 말)를 쓰지 않는다.
// - pro(전문용어)는 지우지 않고 작은 글씨로 병기한다. 다른 곳에서 그 말을 들어도 이어지게.
// - 풀다가 뜻이 틀어지지 않게 caution 에 오해하기 쉬운 지점을 적는다.
// - example 의 숫자는 glossaryExample 입력으로 계산한 값과 같다. 어긋나면 테스트가 잡는다.
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

  // 용어 풀이가 화면에 나오는 순서.
  glossaryOrder: Object.freeze([
    "vatPrice", "supply", "cogs", "shipping", "pg",
    "cm1", "cm1Rate", "beRoas", "maxCpa", "cpa", "finalMargin", "targetMin",
    "bundle", "discountRate", "cogsRate", "shippingPerUnit", "shippingSaving", "consumption",
    "rule1", "rule3", "aovFloor", "marginFloor", "cm1RateFloor"
  ]),

  glossary: Object.freeze({
    vatPrice: Object.freeze({
      plain: "손님이 내는 금액 (부가세 포함)",
      pro: "판매가 · 결제금액 (VAT 포함)",
      short: "가격표에 붙어 있는 가격이에요.",
      detail: "손님이 카드로 실제로 내는 금액이에요. 이 안에는 가게가 나라에 대신 내주는 부가세(10%)가 들어 있어서, 이 금액 전부가 가게 매출은 아니에요.",
      example: "예) 가격표 11,000원이면 손님은 11,000원을 내지만 그중 1,000원은 부가세예요. 가게 몫은 10,000원이에요.",
      caution: ""
    }),
    supply: Object.freeze({
      plain: "부가세 뺀 금액",
      pro: "공급가 (VAT 제외)",
      short: "손님이 낸 돈에서 부가세를 뺀, 진짜 가게 몫이에요.",
      detail: "부가세는 가게가 걷어서 나라에 내는 돈이라 가게 돈이 아니에요. 그래서 얼마 남는지 볼 때는 부가세를 뺀 금액에서 시작해요. 부가세 포함 금액을 1.1로 나누면 돼요.",
      example: "예) 10,000원 ÷ 1.1 = 약 9,091원.",
      caution: ""
    }),
    cogs: Object.freeze({
      plain: "상품값 (물건에 든 돈)",
      pro: "원가 (COGS)",
      short: "물건 1개를 만들거나 사 오는 데 든 돈이에요.",
      detail: "공장에서 만든 가격이나 도매로 사 온 가격이에요. 부가세를 뺀 금액으로 넣어요. 덤으로 주는 물건도 상품값은 들어요.",
      example: "예) 10,000원에 파는 물건을 2,000원에 사 왔다면 상품값은 2,000원이에요.",
      caution: ""
    }),
    shipping: Object.freeze({
      plain: "박스 1개당 택배·포장비",
      pro: "물류비",
      short: "상자에 담아 보내는 데 드는 돈이에요.",
      detail: "택배비와 포장 상자, 포장 작업비 같은 것이 들어가요. 한 박스에 물건을 1개 넣든 5개 넣든 같다고 봐요. 그래서 묶음으로 팔수록 물건 1개가 떠안는 택배비는 줄어요.",
      example: "예) 택배·포장비가 2,500원이면 1개를 보낼 때도 2,500원, 3개를 한 박스에 보낼 때도 2,500원이에요.",
      caution: ""
    }),
    pg: Object.freeze({
      plain: "카드·결제 수수료",
      pro: "PG 수수료",
      short: "결제를 대신 처리해 주는 회사에 내는 수수료예요.",
      detail: "손님이 카드로 결제하면 결제 대행사(PG)가 처리해 주고 결제금액의 일정 %를 가져가요. 부가세가 포함된 결제금액에 곱해요.",
      example: "예) 수수료율이 3%이고 결제금액이 10,000원이면 수수료는 300원이에요.",
      caution: ""
    }),
    cm1: Object.freeze({
      plain: "광고비 쓰기 전에 남는 돈",
      pro: "광고 전 공헌이익 (CM1)",
      short: "팔고 나서, 광고비를 쓰기 전에 손에 남는 돈이에요.",
      detail: "손님이 낸 금액에서 부가세를 빼고, 상품값과 카드 수수료와 택배·포장비를 뺀 돈이에요. 이 돈으로 광고비를 내고, 그러고도 남아야 진짜 이익이에요.",
      example: "예) 10,000원(부가세 포함)짜리 물건, 상품값 2,000원, 카드 수수료 3%, 택배·포장비 2,500원이라면 부가세를 뺀 약 9,091원에서 2,000원 + 300원 + 2,500원을 빼서 약 4,291원이 남아요.",
      caution: "순이익이 아니에요. 인건비·임대료 같은 고정비는 빼지 않았고, 반품·취소도 반영하지 않았어요."
    }),
    cm1Rate: Object.freeze({
      plain: "100원 팔면 남는 돈",
      pro: "CM1율 (공헌이익률)",
      short: "부가세 뺀 매출 100원당, 광고비 쓰기 전에 남는 돈이에요.",
      detail: "남는 돈 ÷ 부가세 뺀 매출이에요. 이 비율이 낮으면 팔아도 남는 게 적어서 광고비를 쓸 여유가 없어요.",
      example: "예) 약 9,091원 중 약 4,291원이 남으니, 100원 팔 때 약 47원이 남아요 (47.2%).",
      caution: ""
    }),
    beRoas: Object.freeze({
      plain: "본전 되는 광고 효율",
      pro: "손익분기 ROAS",
      short: "광고비 100원을 쓸 때 결제금액이 얼마 이상 나와야 본전인지 알려줘요.",
      detail: "ROAS는 '광고비 1원을 썼더니 결제금액이 몇 원 나왔나'를 뜻해요. 광고 관리자 화면에 나오는 ROAS와 같은 기준이에요. 내 ROAS가 이 값보다 낮으면 광고를 할수록 손해예요.",
      example: "예) 위 물건은 233.1%예요. 광고비 100원을 쓰면 결제금액이 233.1원 이상 들어와야 본전이에요 (10,000원 ÷ 4,291원).",
      caution: "광고비는 부가세를 뺀 금액으로 봐요."
    }),
    maxCpa: Object.freeze({
      plain: "주문 1건에 쓸 수 있는 최대 광고비",
      pro: "한계 CPA",
      short: "이 금액까지는 써도 본전이에요. 넘으면 손해예요.",
      detail: "광고로 주문 1건을 만드는 데 드는 비용을 CPA라고 해요. 광고비 쓰기 전에 남는 돈이 곧 쓸 수 있는 최대 광고비예요. 최소한 남기고 싶은 돈이 있으면 그만큼 줄어요.",
      example: "예) 남는 돈이 4,291원이면 주문 1건에 광고비를 4,291원까지 써도 본전이에요. 최소 1,000원은 남기고 싶다면 3,291원까지예요.",
      caution: "첫 구매 기준이에요. 같은 손님이 나중에 또 사 주는 것(재구매)은 계산에 넣지 않았어요."
    }),
    cpa: Object.freeze({
      plain: "주문 1건당 광고비",
      pro: "광고 CPA",
      short: "광고에 쓴 돈을 주문 건수로 나눈 값이에요.",
      detail: "광고비 ÷ 광고로 들어온 주문 수예요. 광고 관리자에서 확인한 값을 부가세 뺀 금액으로 넣으세요. 비워 두면 최대 광고비만 보여줘요.",
      example: "예) 광고비 30만 원으로 주문이 100건 들어왔다면 주문 1건당 광고비는 3,000원이에요.",
      caution: ""
    }),
    finalMargin: Object.freeze({
      plain: "광고비까지 쓰고 남는 돈",
      pro: "최종 마진 (CM1 − CPA)",
      short: "남는 돈에서 주문 1건당 광고비를 뺀 값이에요.",
      detail: "마이너스면 이 주문 하나를 팔수록 손해라는 뜻이에요.",
      example: "예) 남는 돈 4,291원에서 광고비 3,000원을 쓰면 1,291원이 남아요.",
      caution: "인건비·임대료 같은 고정비는 아직 빼지 않았어요."
    }),
    targetMin: Object.freeze({
      plain: "최소한 남기고 싶은 돈",
      pro: "목표 최소 마진",
      short: "이만큼은 꼭 남기고 싶다는 금액이에요.",
      detail: "0으로 두면 본전까지 광고비를 쓸 수 있다고 보고, 숫자를 넣으면 그만큼을 뺀 최대 광고비를 계산해요.",
      example: "예) 남는 돈 4,291원에서 1,000원을 꼭 남기고 싶다면 광고비는 최대 3,291원이에요.",
      caution: ""
    }),
    bundle: Object.freeze({
      plain: "묶음 구성",
      pro: "번들 (1+1, 2+1 …)",
      short: "여러 개를 묶어서 파는 방식이에요.",
      detail: "'2+1'은 2개 값을 받고 1개를 덤으로 줘서 총 3개를 보내는 구성이에요. 손님이 내는 금액은 값을 받는 개수 기준이고, 덤으로 주는 물건도 상품값은 들어요.",
      example: "예) 10,000원짜리를 2+1로 팔면 손님은 20,000원을 내고 3개를 받아요. 상품값은 3개분인 6,000원이 들어요.",
      caution: ""
    }),
    discountRate: Object.freeze({
      plain: "사실상 할인율",
      pro: "실질 할인율",
      short: "덤으로 주는 개수가 총 개수에서 차지하는 비율이에요.",
      detail: "가격표를 깎지 않아도 덤을 주면 사실상 할인이에요. 덤 개수 ÷ 총 개수로 계산해요.",
      example: "예) 2+1은 3개 중 1개가 공짜라서 33.3% 할인이에요 (1 ÷ 3).",
      caution: ""
    }),
    cogsRate: Object.freeze({
      plain: "판매가 중 상품값 비중",
      pro: "원가율",
      short: "부가세 뺀 매출 중 상품값이 차지하는 비율이에요.",
      detail: "이 비율이 높을수록 남는 돈이 적어요.",
      example: "예) 부가세 뺀 매출 약 9,091원에 상품값 2,000원이면 22.0%예요.",
      caution: ""
    }),
    shippingPerUnit: Object.freeze({
      plain: "1개당 택배·포장비",
      pro: "개당 배송비 부담액",
      short: "박스 1개 택배·포장비를 들어 있는 개수로 나눈 값이에요.",
      detail: "묶음이 클수록 이 값이 줄어요.",
      example: "예) 택배·포장비 2,500원인 박스에 3개를 담으면 1개당 약 833원이에요.",
      caution: ""
    }),
    shippingSaving: Object.freeze({
      plain: "1개씩 보낼 때보다 줄어든 택배·포장비",
      pro: "단품 대비 개당 배송비 절감",
      short: "1개씩 보낼 때보다 물건 1개당 택배·포장비가 얼마나 줄었는지예요.",
      detail: "묶음으로 팔면 박스 수가 줄어서 생기는 이득이에요.",
      example: "예) 1개당 2,500원이던 것이 3개 묶음에서는 약 833원이라, 약 1,667원이 줄어요.",
      caution: ""
    }),
    consumption: Object.freeze({
      plain: "1개 쓰는 데 걸리는 기간",
      pro: "소진 주기",
      short: "물건 1개를 다 쓰는 데 걸리는 개월 수예요.",
      detail: "참고용이에요. 묶음 전체를 다 쓰는 데 걸리는 기간을 보여주는 데만 쓰고, 기준 점검에는 쓰지 않아요.",
      example: "예) 1개를 한 달 쓰는 물건이라면, 4개 묶음은 다 쓰는 데 약 4개월 걸려요.",
      caution: ""
    }),
    rule1: Object.freeze({
      plain: "점검 ① 한 번에 결제되는 금액이 충분한가",
      pro: "제1법칙 (결제금액·CM1 하한)",
      short: "한 번에 결제되는 금액이 크거나, 남는 돈이 충분하면 기준 충족이에요.",
      detail: "손님이 한 번에 내는 금액이 최소선 이상이거나, 광고비 쓰기 전에 남는 돈이 최소선 이상이면 통과해요. 둘 중 하나만 넘으면 돼요.",
      example: "예) 최소선이 결제금액 40,000원, 남는 돈 25,000원이라면 결제금액이 59,800원인 묶음은 기준 충족이에요.",
      caution: "시장 표준이 아니라 뷰리드 기획 기준값이에요. 화면에서 바꿀 수 있어요."
    }),
    rule3: Object.freeze({
      plain: "점검 ② 100원 팔면 남는 돈이 충분한가",
      pro: "제3법칙 (CM1율 하한)",
      short: "남는 돈 비율이 최소선 이상이면 기준 충족이에요.",
      detail: "100원을 팔았을 때 광고비 쓰기 전에 남는 돈이 최소선 이상인지 봐요.",
      example: "예) 최소선이 60%라면, 100원 팔 때 광고비 쓰기 전에 60원 이상 남아야 해요.",
      caution: "시장 표준이 아니라 뷰리드 기획 기준값이에요. 화면에서 바꿀 수 있어요."
    }),
    aovFloor: Object.freeze({
      plain: "한 번에 결제되는 금액 최소선",
      pro: "결제금액 하한 (VAT 포함)",
      short: "점검 ①에서 쓰는 기준이에요. 손님이 한 번에 내는 금액이 이 이상이면 충족이에요.",
      detail: "점검 ①은 이 최소선과 아래 '남는 돈 최소선' 중 하나만 넘으면 통과해요.",
      example: "예) 40,000원으로 두면, 한 번에 40,000원 이상 결제하는 구성이 기준을 충족해요.",
      caution: ""
    }),
    marginFloor: Object.freeze({
      plain: "광고비 쓰기 전에 남는 돈 최소선",
      pro: "CM1 하한 (VAT 제외)",
      short: "점검 ①에서 쓰는 기준이에요. 남는 돈이 이 이상이면 충족이에요.",
      detail: "결제금액이 작아도 남는 돈이 충분하면 통과할 수 있게 해 줘요.",
      example: "예) 25,000원으로 두면, 광고비 쓰기 전에 25,000원 이상 남는 구성이 기준을 충족해요.",
      caution: ""
    }),
    cm1RateFloor: Object.freeze({
      plain: "100원 팔면 남는 돈 최소선",
      pro: "CM1율 하한",
      short: "점검 ②에서 쓰는 기준이에요. 남는 돈 비율이 이 이상이면 충족이에요.",
      detail: "숫자는 %로 넣어요.",
      example: "예) 60으로 두면, 100원 팔 때 60원 이상 남는 구성이 기준을 충족해요.",
      caution: ""
    })
  })
});
