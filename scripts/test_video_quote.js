const assert = require("node:assert/strict");

global.window = global;
require("../video-quote/pricing-config.js");
const calculator = require("../video-quote/calculator.js");
const config = global.VIDEO_QUOTE_CONFIG;

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// 화면이 처음 그리는 기본 조건. 인라인 상수였던 값을 그대로 고정한다.
const defaults = calculator.calculate(
  { quantities: { s15: 0, s30: 6, m60: 4 }, serviceLevel: "standard", options: {} },
  config
);
check(defaults.base, 2100000, "기본 제작비");
check(defaults.discount, 105000, "10편이면 볼륨 할인이 붙는다");
check(defaults.optionTotal, 0, "옵션 미선택");
check(defaults.supply, 1995000, "공급가");
check(defaults.vat, 199500, "VAT 10%");
check(defaults.total, 2194500, "최종 예상 견적");
check(defaults.totalQuantity, 10, "총 편수");
check(defaults.summary, "30초 6편 + 1분 4편", "요약 문구");
check(defaults.approximate, false, "최소 기준가 옵션이 없으면 물결표를 안 붙인다");

// 1분 단가만 Deluxe 로 갈린다. 30초 90만원은 그대로다.
const deluxe = calculator.calculate(
  { quantities: { s15: 0, s30: 6, m60: 4 }, serviceLevel: "deluxe", options: {} },
  config
);
check(deluxe.base, 3700000, "Deluxe 1분 단가 70만원");
check(deluxe.discount, 185000, "할인은 기본 제작비 기준");
check(deluxe.total, 3866500, "Deluxe 최종 견적");

// 볼륨 할인 경계. 9편은 안 붙고 10편부터 붙는다.
const nine = calculator.calculate({ quantities: { s30: 9 }, options: {} }, config);
check(nine.totalQuantity, 9, "9편");
check(nine.discountApplied, false, "9편에는 할인이 없다");
check(nine.discount, 0, "할인액 0원");
check(nine.total, 1485000, "9편 총액");

const ten = calculator.calculate({ quantities: { s30: 10 }, options: {} }, config);
check(ten.discountApplied, true, "10편부터 할인");
check(ten.discount, 75000, "150만원의 5%");
check(ten.total, 1567500, "10편 총액");

// serviceLevel 을 안 주면 config 의 기본값을 쓴다.
check(calculator.calculate({ quantities: { m60: 1 }, options: {} }, config).base, 300000, "기본 레벨은 Standard");

// 수량 단위가 있는 옵션만 수량을 곱한다.
const withQuantityOption = calculator.calculate(
  { quantities: { s30: 1 }, options: { shootAdd: { on: true, quantity: 3 } } },
  config
);
check(withQuantityOption.optionTotal, 750000, "촬영 추가 25만원 × 3시간");
check(withQuantityOption.supply, 900000, "할인 없는 공급가");
check(withQuantityOption.total, 990000, "VAT 포함");

const flatOption = calculator.calculate(
  { quantities: { s30: 1 }, options: { bgm: { on: true, quantity: 5 } } },
  config
);
check(flatOption.optionTotal, 50000, "단위 없는 옵션은 수량을 무시한다");

const offOption = calculator.calculate(
  { quantities: { s30: 1 }, options: { bgm: { on: false, quantity: 1 } } },
  config
);
check(offOption.optionTotal, 0, "꺼진 옵션은 안 더한다");

const brokenQuantity = calculator.calculate(
  { quantities: { s30: 1 }, options: { revision: { on: true, quantity: 0 } } },
  config
);
check(brokenQuantity.optionTotal, 100000, "수량이 1 미만이면 1로 본다");

// 상태 3종.
check(defaults.state.tone, "red", "1분이 있으면 레벨 확인 상태");
check(defaults.state.title, "Standard / Deluxe 선택", "레벨 확인 제목");

const approxState = calculator.calculate(
  { quantities: { s30: 5 }, options: { planS: { on: true }, bgm: { on: true } } },
  config
);
check(approxState.state.tone, "yellow", "최소 기준가 옵션이 있으면 노란색");
check(approxState.approxCount, 2, "최소 기준가 옵션 2건");
check(approxState.approximate, true, "물결표를 붙인다");

const readyState = calculator.calculate(
  { quantities: { s30: 5 }, options: { shoot: { on: true } } },
  config
);
check(readyState.state.tone, "green", "1분도 최소 기준가도 없으면 바로 산출 가능");
check(readyState.optionTotal, 500000, "촬영 50만원");

// 명세 밖의 레벨은 조용히 넘어가지 않는다.
assert.throws(() => calculator.calculate({ quantities: {}, serviceLevel: "gold" }, config), /Unknown service level/);
checks += 1;

// 아무것도 안 고르면 0원이고 요약이 비어 있다.
const empty = calculator.calculate({ quantities: {}, options: {} }, config);
check(empty.total, 0, "빈 조건은 0원");
check(empty.lines.length, 0, "표시할 항목이 없다");
check(empty.summary, "", "요약도 비어 있다");

// 내역 줄은 제작 항목 다음에 옵션이 온다.
const lines = calculator.calculate(
  { quantities: { s15: 2, m60: 1 }, options: { shootAdd: { on: true, quantity: 2 } } },
  config
).lines;
check(lines.length, 3, "제작 2줄 + 옵션 1줄");
check(lines[0].label, "15초 · 숏폼 부스터 × 2", "첫 줄은 15초");
check(lines[1].label, "1분 · Standard × 1", "1분 줄에는 레벨이 붙는다");
check(lines[2].label, "촬영 추가 × 2", "옵션 줄");
check(lines[2].amount, 500000, "촬영 추가 2시간");

// 공개 페이지에 원가·마진 성격의 값이 섞여 있지 않은지 본다.
const configText = require("node:fs").readFileSync(
  require("node:path").join(__dirname, "../video-quote/pricing-config.js"),
  "utf8"
);
["원가", "마진", "매입", "외주단가"].forEach((banned) => {
  assert.ok(!configText.includes(`${banned}:`), `설정에 ${banned} 값이 있으면 안 된다`);
  checks += 1;
});

console.log(`Video quote rules: ${checks} assertions passed.`);
