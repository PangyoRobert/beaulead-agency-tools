const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../ecommerce-unit-economics/economics-config.js");
const calculator = require("../ecommerce-unit-economics/calculator.js");
const config = global.ECOMMERCE_ECONOMICS_CONFIG;

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}
function close(actual, expected, message, tolerance = 1e-6) {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) < tolerance,
    `${message}: ${actual} != ${expected}`
  );
  checks += 1;
}

// 화면이 쓰는 기본 입력을 설정에서 만든다. 화면 코드와 같은 변환을 일부러 여기서 따로 쓴다.
function inputFrom(overrides = {}) {
  const d = config.defaults;
  const t = config.thresholds;
  return {
    unitPrice: d.unitPrice,
    unitCogs: d.unitCogs,
    shippingPerBox: d.shippingPerBox,
    pgRate: d.pgRatePercent / 100,
    targetMinMargin: d.targetMinMargin,
    consumptionMonths: d.consumptionMonths,
    thresholds: { aovFloor: t.aovFloor, marginFloor: t.marginFloor, cm1RateFloor: t.cm1RatePercent / 100 },
    cpaByBundle: {},
    ...overrides
  };
}

// --- 설정 구조 -------------------------------------------------------------
check(config.vatRate, 0.1, "VAT 10%");
check(config.bundles.map((b) => b.id), ["single", "b1p1", "b2p1", "b3p1", "b4p1"], "번들 5종과 순서");
check(config.bundles.map((b) => [b.paidQty, b.freeQty]), [[1, 0], [1, 1], [2, 1], [3, 1], [4, 1]], "유료/무료 수량");
check(config.thresholds, { aovFloor: 40000, marginFloor: 25000, cm1RatePercent: 60 }, "기준값은 사용자 시트와 같다");
assert.ok(Object.isFrozen(config) && Object.isFrozen(config.defaults) && Object.isFrozen(config.bundles), "설정은 동결");

// --- 사용자 시트 재현: VAT 0% 로 두면 시트의 숫자와 같아야 한다 ------------------
const sheetConfig = { ...config, vatRate: 0 };
const sheet = calculator.calculateAll(inputFrom({ cpaByBundle: { single: 15000, b1p1: 15000, b2p1: 15000, b3p1: 15000, b4p1: 15000 } }), sheetConfig);
[22503, 19503, 45506, 71509, 97512].forEach((expected, i) => close(sheet[i].cm1, expected, `시트 CM1 ${sheet[i].label}`));
[29900, 29900, 59800, 89700, 119600].forEach((expected, i) => close(sheet[i].grossSales, expected, `시트 번들 판매가 ${sheet[i].label}`));
[0, 0.5, 1 / 3, 0.25, 0.2].forEach((expected, i) => close(sheet[i].discountRate, expected, `시트 실질 할인율 ${sheet[i].label}`));
[897, 897, 1794, 2691, 3588].forEach((expected, i) => close(sheet[i].pgFee, expected, `시트 PG 수수료 ${sheet[i].label}`));
[0.7526086957, 0.6522742475, 0.7609698997, 0.7972017837, 0.8153177258].forEach((expected, i) => close(sheet[i].cm1Rate, expected, `시트 CM1율 ${sheet[i].label}`, 1e-9));
[1.328711727, 1.533097472, 1.314112425, 1.25438756, 1.226515711].forEach((expected, i) => close(sheet[i].beRoas, expected, `시트 BE ROAS ${sheet[i].label}`, 1e-9));
[7503, 4503, 30506, 56509, 82512].forEach((expected, i) => close(sheet[i].finalMargin, expected, `시트 최종 마진 ${sheet[i].label}`));
[3500, 1750, 1166.666667, 875, 700].forEach((expected, i) => close(sheet[i].shippingPerUnit, expected, `시트 개당 배송비 ${sheet[i].label}`, 1e-6));
[0, 1750, 2333.333333, 2625, 2800].forEach((expected, i) => close(sheet[i].shippingSavingPerUnit, expected, `시트 개당 배송비 절감 ${sheet[i].label}`, 1e-6));
// 시트의 제1·제3법칙 결과: 단품·1+1 은 불가, 2+1 이상은 통과 / 제3법칙은 전부 통과.
check(sheet.map((b) => b.rule1.pass), [false, false, true, true, true], "시트 제1법칙 결과");
check(sheet.map((b) => b.rule3.pass), [true, true, true, true, true], "시트 제3법칙 결과");

// --- VAT 10% 기준(이 페이지의 기준): 손계산 값으로 고정 -----------------------
// 공급가 = 결제금액 / 1.1. 예) 단품 29,900 / 1.1 = 27,181.8182
// 단품 CM1 = 27,181.8182 - 3,000 - 897 - 3,500 = 19,784.8182
const vat = calculator.calculateAll(inputFrom(), config);
[19784.818182, 16784.818182, 40069.636364, 63354.454545, 86639.272727].forEach((expected, i) =>
  close(vat[i].cm1, expected, `VAT 기준 CM1 ${vat[i].label}`)
);
[27181.818182, 27181.818182, 54363.636364, 81545.454545, 108727.272727].forEach((expected, i) =>
  close(vat[i].supplySales, expected, `VAT 기준 공급가 ${vat[i].label}`)
);
// VAT 를 매출로 세던 시트보다 CM1 이 낮다: 단품 22,503 -> 19,784.82
assert.ok(vat[0].cm1 < sheet[0].cm1, "VAT 를 빼면 CM1 이 낮아진다");
checks += 1;
close(vat[0].vatAmount, 29900 - 27181.818182, "VAT 금액 = 결제금액 - 공급가");
// BE ROAS 는 결제금액(VAT 포함) / CM1 이다. 광고 매체가 보고하는 구매 전환 가치와 같은 기준.
close(vat[0].beRoas, 29900 / 19784.818182, "VAT 기준 BE ROAS 단품");
close(vat[2].beRoas, 59800 / 40069.636364, "VAT 기준 BE ROAS 2+1");
// 제1법칙: 단품·1+1 은 결제 4만 미만이고 CM1 도 2.5만 미만이라 미통과, 2+1 부터 결제금액으로 통과
check(vat.map((b) => b.rule1.pass), [false, false, true, true, true], "VAT 기준 제1법칙");
check(vat.map((b) => b.rule1.byAov), [false, false, true, true, true], "제1법칙 결제금액 조건");
check(vat.map((b) => b.rule1.byMargin), [false, false, true, true, true], "제1법칙 CM1 조건");
// 제3법칙: 1+1 의 CM1율 = 16,784.82 / 27,181.82 = 0.6175 로 60% 를 간신히 넘는다
close(vat[1].cm1Rate, 16784.818182 / 27181.818182, "1+1 CM1율");
check(vat.map((b) => b.rule3.pass), [true, true, true, true, true], "VAT 기준 제3법칙");

// 기준값을 올리면 판정이 바뀐다(기준값은 입력이다)
const strict = calculator.calculateAll(inputFrom({ thresholds: { aovFloor: 40000, marginFloor: 25000, cm1RateFloor: 0.75 } }), config);
check(strict.map((b) => b.rule3.pass), [false, false, false, true, true], "CM1율 하한 75% 면 단품·1+1·2+1 미통과");
// 제1법칙은 둘 중 하나만 만족해도 통과(or). 결제금액 하한을 높이면 CM1 조건만 남는다.
const marginOnly = calculator.calculateAll(inputFrom({ thresholds: { aovFloor: 1e9, marginFloor: 25000, cm1RateFloor: 0.6 } }), config);
check(marginOnly.map((b) => b.rule1.pass), [false, false, true, true, true], "결제금액 조건을 막아도 CM1 2.5만 이상이면 통과");

// --- 한계 CPA ---------------------------------------------------------------
close(vat[0].maxCpa, 19784.818182, "목표 최소 마진 0 이면 한계 CPA = CM1");
const withTarget = calculator.calculateAll(inputFrom({ targetMinMargin: 5000 }), config);
close(withTarget[2].maxCpa, 40069.636364 - 5000, "한계 CPA = CM1 - 목표 최소 마진");
const targetTooHigh = calculator.calculateAll(inputFrom({ targetMinMargin: 99999 }), config);
check(targetTooHigh.map((b) => b.maxCpa), [null, null, null, null, null], "목표 마진이 CM1 이상이면 한계선 없음(null)");

// --- 최종 마진은 CPA 를 넣은 번들만 ---------------------------------------------
const partial = calculator.calculateAll(inputFrom({ cpaByBundle: { b2p1: 15000, single: null } }), config);
check(partial.map((b) => b.cpa), [null, null, 15000, null, null], "입력한 번들만 CPA 가 있다");
close(partial[2].finalMargin, 40069.636364 - 15000, "최종 마진 = CM1 - CPA");
check(partial.filter((b) => b.finalMargin === null).length, 4, "CPA 를 안 넣은 번들은 최종 마진을 계산하지 않는다");
close(calculator.calculateAll(inputFrom({ cpaByBundle: { single: 0 } }), config)[0].finalMargin, 19784.818182, "CPA 0 은 입력으로 센다(비움과 다르다)");

// --- 극단값 ------------------------------------------------------------------
const loss = calculator.calculateAll(inputFrom({ unitCogs: 30000 }), config);
assert.ok(loss[0].cm1 < 0, "원가가 판매가보다 크면 CM1 음수");
checks += 1;
check([loss[0].beRoas, loss[0].maxCpa], [null, null], "CM1 이 0 이하면 BE ROAS·한계 CPA 는 null(음수를 내보내지 않는다)");
check(loss[0].rule3.pass, false, "CM1율 음수는 제3법칙 미통과");
const noShipping = calculator.calculateAll(inputFrom({ shippingPerBox: 0 }), config);
check(noShipping.map((b) => b.shippingSavingPerUnit), [0, 0, 0, 0, 0], "물류비 0 이면 절감액도 0");
const noPg = calculator.calculateAll(inputFrom({ pgRate: 0 }), config);
check(noPg.map((b) => b.pgFee), [0, 0, 0, 0, 0], "PG 수수료율 0");
check(vat[0].consumptionMonths, 1, "단품 소진 개월");
check(vat.map((b) => b.consumptionMonths), [1, 2, 3, 4, 5], "총 소진 개월 = 소진 주기 x 총 수량(참고용)");

// --- 입력 검증 ---------------------------------------------------------------
check(calculator.validateInput(inputFrom()), [], "기본 입력은 문제가 없다");
assert.ok(calculator.validateInput(inputFrom({ unitPrice: 0 })).length > 0, "판매가 0");
assert.ok(calculator.validateInput(inputFrom({ unitPrice: NaN })).length > 0, "판매가 NaN");
assert.ok(calculator.validateInput(inputFrom({ pgRate: 1 })).length > 0, "PG 100%");
assert.ok(calculator.validateInput(inputFrom({ pgRate: -0.01 })).length > 0, "PG 음수");
assert.ok(calculator.validateInput(inputFrom({ unitCogs: -1 })).length > 0, "원가 음수");
assert.ok(calculator.validateInput(inputFrom({ shippingPerBox: -1 })).length > 0, "물류비 음수");
assert.ok(calculator.validateInput(inputFrom({ targetMinMargin: -1 })).length > 0, "목표 마진 음수");
assert.ok(calculator.validateInput(inputFrom({ consumptionMonths: 0 })).length > 0, "소진 주기 0");
assert.ok(calculator.validateInput(inputFrom({ cpaByBundle: { single: -5 } })).length > 0, "CPA 음수");
assert.ok(calculator.validateInput(inputFrom({ thresholds: { aovFloor: 1, marginFloor: 1, cm1RateFloor: 1.5 } })).length > 0, "CM1율 하한 150%");
assert.ok(calculator.validateInput(null).length > 0, "입력 없음");
checks += 11;
assert.throws(() => calculator.calculateAll(inputFrom({ unitPrice: 0 }), config), /판매가/, "잘못된 입력은 계산하지 않고 던진다");
assert.throws(() => calculator.calculateAll(inputFrom(), { bundles: [] }), /vatRate/, "설정에 vatRate 가 없으면 던진다");
checks += 2;

// --- 페이지 정적 검사: 공개 저장소 안전·전제 문구 ---------------------------------
const pagePath = path.join(__dirname, "..", "ecommerce-unit-economics", "index.html");
if (fs.existsSync(pagePath)) {
  const html = fs.readFileSync(pagePath, "utf8");
  // 입력을 밖으로 내보내는 경로가 없어야 한다(AGENTS.md 공개 저장소 안전 규칙)
  ["localStorage", "sessionStorage", "indexedDB", "URLSearchParams", "fetch(", "XMLHttpRequest", "sendBeacon", "history.pushState", "location.hash", "location.search"].forEach(
    (needle) => {
      assert.ok(!html.includes(needle), `index.html 에 ${needle} 가 있으면 안 된다`);
      checks += 1;
    }
  );
  assert.doesNotMatch(html, /<form[^>]*\saction=/i, "<form action> 금지");
  // 전제 문구는 화면에서 빠지면 안 된다
  assert.match(html, /가상 예시/, "가상 예시값 표시");
  assert.match(html, /반품·취소 미반영/, "반품·취소 미반영 표시");
  assert.match(html, /VAT/, "금액 기준(VAT) 안내");
  checks += 4;
  // 숫자를 화면 코드에 다시 적지 않는다: 기본값 29900 같은 값은 설정에만 있다
  assert.ok(!/29,?900|\b3000\b|\b3500\b/.test(html), "index.html 에 기본값 숫자를 하드코딩하지 않는다");
  checks += 1;
}

console.log(`ecommerce-unit-economics OK (${checks} checks)`);
