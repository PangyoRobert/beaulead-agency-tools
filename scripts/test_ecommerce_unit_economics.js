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

// --- 쉬운 말 풀이: 용어 사전 ---------------------------------------------------------
const explain = require("../ecommerce-unit-economics/explain.js");
const G = config.glossary;
// 쉬운 말에 새어 나오면 안 되는 전문용어. 전문용어는 pro(작은 글씨 병기)와 detail(말뜻을 설명하는 곳)에만 둔다.
const JARGON = ["CM1", "ROAS", "CPA", "PG", "VAT", "LTV", "공헌이익", "번들", "손익분기", "한계", "마진", "법칙"];
const noJargon = (text) => JARGON.filter((word) => text.includes(word));

check([...config.glossaryOrder].sort(), Object.keys(G).sort(), "표시 순서와 용어 사전의 항목이 정확히 같다");
check(new Set(config.glossaryOrder).size, config.glossaryOrder.length, "표시 순서에 중복이 없다");
Object.entries(G).forEach(([term, g]) => {
  ["plain", "pro", "short", "detail", "example"].forEach((field) => {
    assert.ok(typeof g[field] === "string" && g[field].trim().length > 0, `${term}.${field} 가 비어 있다`);
    checks += 1;
  });
  assert.equal(typeof g.caution, "string", `${term}.caution 은 문자열(없으면 빈 문자열)`);
  checks += 1;
  // 쉬운 말·한 줄 풀이·예시·주의에는 전문용어가 없어야 한다
  ["plain", "short", "example", "caution"].forEach((field) => {
    check(noJargon(g[field]), [], `${term}.${field} 에 전문용어가 새어 나왔다: ${g[field]}`);
  });
  assert.ok(g.example.startsWith("예)"), `${term}.example 은 "예)" 로 시작한다`);
  checks += 1;
  assert.ok(g.plain !== g.pro, `${term}: 쉬운 말과 전문용어 표기가 같다`);
  checks += 1;
});
config.bundles.forEach((b) => {
  check(noJargon(b.plainLabel), [], `${b.id}.plainLabel 에 전문용어가 있다`);
  assert.ok(b.proLabel && b.plainLabel, `${b.id}: 쉬운 이름과 병기 이름이 모두 있다`);
  checks += 1;
});
// 가장 중요한 오해 방지 문구가 빠지지 않는다
assert.match(G.cm1.caution, /순이익이 아니에요/, "남는 돈은 순이익이 아니라는 주의");
assert.match(G.maxCpa.caution, /첫 구매/, "최대 광고비는 첫 구매 기준이라는 주의");
assert.match(G.beRoas.caution, /부가세/, "광고비는 부가세 뺀 금액이라는 주의");
checks += 3;

// 예시 숫자는 glossaryExample 로 실제 계산한 값과 같아야 한다 — 글과 계산이 어긋나면 여기서 잡는다
const ex = config.glossaryExample;
const exInput = inputFrom({
  unitPrice: ex.unitPrice, unitCogs: ex.unitCogs, shippingPerBox: ex.shippingPerBox, pgRate: ex.pgRatePercent / 100,
  targetMinMargin: 0, cpaByBundle: { single: ex.cpa }
});
const exRes = Object.fromEntries(calculator.calculateAll(exInput, config).map((b) => [b.id, b]));
const exTarget = Object.fromEntries(calculator.calculateAll({ ...exInput, targetMinMargin: ex.targetMinMargin }, config).map((b) => [b.id, b]));
const W = explain.won;
const hasAll = (term, tokens) => tokens.forEach((token) => {
  assert.ok(G[term].example.includes(token), `${term}.example 에 "${token}" 가 있어야 한다: ${G[term].example}`);
  checks += 1;
});
hasAll("vatPrice", [W(11000), W(11000 - 11000 / 1.1)]);
close(11000 / 1.1, 10000, "예시: 11,000원의 공급가는 10,000원");
hasAll("supply", [W(ex.unitPrice / 1.1)]);
hasAll("cogs", [W(ex.unitCogs)]);
hasAll("shipping", [W(ex.shippingPerBox)]);
hasAll("pg", [W(ex.unitPrice * ex.pgRatePercent / 100), W(ex.unitPrice)]);
hasAll("cm1", [W(exRes.single.supplySales), W(exRes.single.pgFee), W(exRes.single.cm1), W(ex.unitCogs), W(ex.shippingPerBox)]);
hasAll("cm1Rate", [explain.pct1(exRes.single.cm1Rate), W(exRes.single.supplySales), W(exRes.single.cm1)]);
hasAll("beRoas", [explain.pct1(exRes.single.beRoas), (exRes.single.beRoas * 100).toFixed(1) + "원", W(exRes.single.cm1)]);
hasAll("maxCpa", [W(exRes.single.maxCpa), W(exTarget.single.maxCpa), W(ex.targetMinMargin)]);
close(300000 / 100, ex.cpa, "예시: 광고비 30만 원 ÷ 주문 100건 = 3,000원");
hasAll("cpa", ["30만 원", "100건", W(ex.cpa)]);
hasAll("finalMargin", [W(exRes.single.cm1), W(ex.cpa), W(exRes.single.finalMargin)]);
hasAll("targetMin", [W(exRes.single.cm1), W(ex.targetMinMargin), W(exTarget.single.maxCpa)]);
hasAll("bundle", [W(exRes.b2p1.grossSales), W(exRes.b2p1.totalCogs)]);
hasAll("discountRate", [explain.pct1(exRes.b2p1.discountRate)]);
hasAll("cogsRate", [W(exRes.single.supplySales), W(ex.unitCogs), explain.pct1(exRes.single.cogsRate)]);
hasAll("shippingPerUnit", [W(ex.shippingPerBox), W(exRes.b2p1.shippingPerUnit)]);
hasAll("shippingSaving", [W(ex.shippingPerBox), W(exRes.b2p1.shippingPerUnit), W(exRes.b2p1.shippingSavingPerUnit)]);
hasAll("rule1", [W(config.thresholds.aovFloor), W(config.thresholds.marginFloor), W(vat[2].grossSales)]);
hasAll("rule3", [config.thresholds.cm1RatePercent + "%"]);
hasAll("aovFloor", [W(config.thresholds.aovFloor)]);
hasAll("marginFloor", [W(config.thresholds.marginFloor)]);
check(exRes.single.finalMargin > 0, true, "예시의 최종 마진은 양수");

// --- 문장 요약 ----------------------------------------------------------------------
const labelOf = (id) => config.bundles.find((b) => b.id === id).plainLabel;
const textsOf = (lines) => lines.map((line) => line.text);
const defaultIn = inputFrom();
const single = vat[0];
check(
  textsOf(explain.summary(single, defaultIn, labelOf("single"))),
  [
    "“1개만 판매” 구성이라면 손님이 29,900원을 내요. 부가세를 빼면 27,182원이에요.",
    "여기서 상품값 3,000원, 카드·결제 수수료 897원, 택배·포장비 3,500원을 빼면, 광고비를 쓰기 전에 19,785원이 남아요.",
    "그래서 주문 1건에 광고비를 19,785원까지 쓰면 딱 본전이에요.",
    "광고비 100원을 쓸 때 결제금액이 151.1원 이상 나오면 본전이에요."
  ],
  "단품 한눈에 보기 문장"
);
const b2 = explain.summary(vat[2], defaultIn, labelOf("b2p1"));
assert.ok(b2[0].text.includes("2개 사면 1개 더 (총 3개)") && b2[0].text.includes("59,800원"), "2+1 문장: 구성 이름과 결제금액");
assert.ok(b2[1].text.includes("40,070원이 남아요"), "2+1 문장: 남는 돈");
assert.ok(b2[3].text.includes("149.2원 이상"), "2+1 문장: 본전 광고 효율");
checks += 3;
// 숫자는 계산 결과에서 그대로 온다(문장이 따로 계산하지 않는다)
const sentenceNumbers = (lines) => lines.map((l) => l.text).join(" ");
close(Number(sentenceNumbers(b2).match(/결제금액이 ([\d.]+)원 이상/)[1]), Math.round(vat[2].beRoas * 1000) / 10, "문장의 효율 숫자 = 계산값(소수 첫째 자리)", 1e-9);

// 광고비를 넣으면 마지막 줄이 붙는다 (남는 경우 / 손해인 경우)
const withCpa = explain.summary(calculator.calculateAll(inputFrom({ cpaByBundle: { single: 15000 } }), config)[0], inputFrom({ cpaByBundle: { single: 15000 } }), labelOf("single"));
check(withCpa[withCpa.length - 1], { text: "입력하신 주문 1건당 광고비 15,000원을 쓰면, 광고비까지 쓰고도 4,785원이 남아요.", tone: "ok" }, "광고비를 넣었을 때 남는 경우");
const lossCpa = calculator.calculateAll(inputFrom({ cpaByBundle: { single: 25000 } }), config)[0];
check(explain.summary(lossCpa, inputFrom({ cpaByBundle: { single: 25000 } }), labelOf("single")).pop(), { text: "입력하신 주문 1건당 광고비 25,000원을 쓰면, 5,215원 손해예요.", tone: "bad" }, "광고비를 넣었을 때 손해인 경우");

// 광고비를 쓰기 전부터 손해이면 본전·최대 광고비 문장을 내지 않는다
const lossLines = explain.summary(loss[0], inputFrom({ unitCogs: 30000 }), labelOf("single"));
check(lossLines.length, 2, "손해 구성은 두 줄만");
assert.match(lossLines[1].text, /광고비를 쓰기 전부터 손해예요/, "손해 문구");
assert.ok(!lossLines.some((l) => /본전이에요/.test(l.text)), "손해 구성에는 본전 문장이 없다");
checks += 2;
// 남기고 싶은 돈이 너무 커서 여유가 없을 때
const tooHigh = explain.summary(targetTooHigh[0], inputFrom({ targetMinMargin: 99999 }), labelOf("single"));
assert.ok(tooHigh.some((l) => /광고비를 쓸 여유가 없어요/.test(l.text)), "목표 마진이 너무 크면 여유 없음 문장");
checks += 1;
// 목표 최소 마진이 있으면 조건을 밝힌다
assert.match(explain.summary(withTarget[0], inputFrom({ targetMinMargin: 5000 }), labelOf("single"))[2].text, /최소 5,000원은 남기는 조건/, "목표 마진 조건 문구");
checks += 1;

// 문장 전체에 전문용어가 없다
const allSentences = [
  ...explain.summary(single, defaultIn, labelOf("single")), ...b2, ...withCpa, ...lossLines, ...tooHigh
].map((l) => l.text).join(" ");
check(noJargon(allSentences), [], "생성 문장에 전문용어가 없다");

// 문장의 조사: 금액은 모두 "원" 으로 끝나므로 받침이 있다(을/이)
assert.ok(!/원를|원가 |원는/.test(allSentences), "조사 오류(원를/원는)가 없다");
checks += 1;

// --- 계산 과정 ----------------------------------------------------------------------
const stepsOf = (b, input) => explain.steps(b, input, config.vatRate);
const s = stepsOf(single, defaultIn);
check(s.length, 8, "계산 과정은 8단계");
check(s.map((x) => x.formula), [
  "29,900원 × 1개 = 29,900원",
  "29,900원 ÷ (1 + 10%) = 27,182원",
  "3,000원 × 1개 = 3,000원",
  "29,900원 × 3% = 897원",
  "3,500원",
  "27,182원 − 3,000원 − 897원 − 3,500원 = 19,785원",
  "29,900원 ÷ 19,785원 = 151.1%",
  "19,785원 − 0원 = 19,785원"
], "단품 계산 과정");
check(stepsOf(vat[2], defaultIn)[2].formula, "3,000원 × 3개 = 9,000원", "덤으로 주는 물건까지 상품값에 들어간다");
check(stepsOf(loss[0], inputFrom({ unitCogs: 30000 }))[6].formula, "계산할 수 없어요 (남는 돈이 0원 이하)", "손해 구성의 본전 광고 효율");
// 화면에 적힌(반올림된) 숫자로 직접 계산해도 1원 안팎으로만 어긋난다 — 화면의 "1원쯤 차이" 안내가 맞는지 확인
vat.forEach((b) => {
  const shown = Math.round(b.supplySales) - Math.round(b.totalCogs) - Math.round(b.pgFee) - Math.round(b.shipping);
  assert.ok(Math.abs(shown - Math.round(b.cm1)) <= 2, `${b.label}: 반올림 숫자로 계산한 값이 ${shown}, 표시된 값은 ${Math.round(b.cm1)}`);
  checks += 1;
});

// 금액 표시
check([explain.won(-0.4), explain.won(0), explain.won(1234567.5), explain.won(-18424.4)], ["0원", "0원", "1,234,568원", "−18,424원"], "금액 표기(0 이 되는 음수에는 마이너스를 붙이지 않는다)");
check([explain.pct1(0.4720000001), explain.pctPlain(0.03), explain.pctPlain(0.025)], ["47.2%", "3%", "2.5%"], "비율 표기");

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

  // 화면에 직접 적힌 글(스크립트 밖)에는 전문용어가 단독으로 나오지 않는다. 괄호 안 병기는 허용한다.
  const body = html.split("<body>")[1].split("</body>")[0];
  let visible = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
  for (let i = 0; i < 4; i += 1) visible = visible.replace(/\([^()]*\)/g, "");
  check(noJargon(visible), [], "index.html 에 직접 적힌 글에 전문용어가 단독으로 나오지 않는다");
  // 괄호 병기로는 남아 있어야 하는 것(부가세(VAT))
  assert.match(body, /부가세\(VAT\)/, "부가세(VAT) 병기");
  checks += 1;

  // 화면이 가리키는 용어는 전부 용어 사전에 있다 (data-term, term: "...")
  const referenced = [...html.matchAll(/data-term="(\w+)"/g), ...html.matchAll(/term: "(\w+)"/g)].map((m) => m[1]);
  assert.ok(referenced.length >= 25, `화면이 용어를 충분히 연결한다(${referenced.length}개)`);
  checks += 1;
  referenced.forEach((term) => {
    assert.ok(G[term], `화면이 사전에 없는 용어 "${term}" 를 가리킨다`);
    checks += 1;
  });
  // 사전의 모든 용어가 화면의 어딘가에서 입력 칸이나 표 줄로 쓰이거나 풀이 목록에 나온다
  check(config.glossaryOrder.every((term) => G[term]), true, "풀이 목록의 모든 용어가 사전에 있다");

  // 풀이는 주소(해시)를 읽지 않고 그 자리에서 연다
  assert.match(html, /details\.open = true/, "ⓘ 는 풀이를 그 자리에서 연다");
  checks += 1;
}

console.log(`ecommerce-unit-economics OK (${checks} checks)`);
