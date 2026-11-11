const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../lead-cps-calculator/cps-config.js");
require("../lead-cpa-guide/pricing-config.js");
const calc = require("../lead-cps-calculator/calculator.js");
const config = global.LEAD_CPS_CONFIG;
const guide = global.LEAD_CPA_GUIDE_CONFIG;

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}
function close(actual, expected, message, tolerance = 1e-6) {
  assert.ok(typeof actual === "number" && Math.abs(actual - expected) < tolerance, `${message}: ${actual} != ${expected}`);
  checks += 1;
}

const base = {
  spend: 30000000, cpa: 33000, baseRate: 0.08, rates: [0.05, 0.08, 0.12],
  refFeeRate: 0.15, leanRate: 0.08, hybridBaseRate: 0.05, advValue: null,
  internal: true, ops: 3000000, targetMargin: 0.25, mg: null
};
const out = calc.analyze(base);
check(out.ok, true, "정상 입력");
close(out.leads, 30000000 / 33000, "유효 DB = 광고비 ÷ CPA");
close(out.refFee, 4500000, "기준 수수료 = 광고비 × 15%");
close(out.cpsPure, 61875, "순수 CPS = 기준 수수료 ÷ 기준 확정 건수");
close(out.cpsHybrid, 41250, "하이브리드 CPS = (기준 수수료 − 기본료) ÷ 기준 확정 건수");
close(out.hybridBase, 1500000, "기본료 = 광고비 × 5%");

const col = Object.fromEntries(out.columns.map((c) => [c.rate, c]));
check(out.columns.map((c) => c.rate), [0.05, 0.08, 0.12], "전환율 오름차순");
check(out.columns.filter((c) => c.isBase).map((c) => c.rate), [0.08], "기준 열 하나");

// 기준 전환율에서는 세 구조의 수취액이 같다(광고주 비용 동일).
close(col[0.08].cells.hybrid.revenue, 4500000, "기준 전환율: 하이브리드 = 고정 수수료");
close(col[0.08].cells.cps.revenue, 4500000, "기준 전환율: 순수 CPS = 고정 수수료");
// 전환율이 변하면 위험이 이전된다.
close(col[0.05].cells.hybrid.revenue, 3375000, "5% 하이브리드");
close(col[0.05].cells.cps.revenue, 2812500, "5% 순수 CPS");
close(col[0.12].cells.hybrid.revenue, 6000000, "12% 하이브리드");
close(col[0.12].cells.cps.revenue, 6750000, "12% 순수 CPS");
close(col[0.05].cells.flat.revenue, 4500000, "고정 수수료는 전환율과 무관");
close(col[0.08].cells.lean.revenue, 2400000, "1단계 = 광고비 × 수수료율");

// 항등식: 광고주 확정 1건당 총비용 = (광고비 + 수취액) ÷ 확정 건수, 광고비만의 비용 = CPA ÷ 전환율
close(col[0.08].adCostOnly, 412500, "광고비만 확정 1건당 = CPA ÷ 전환율");
close(col[0.08].cells.flat.advCostPerSale, (30000000 + 4500000) / col[0.08].sales, "광고주 확정 1건당 총비용");

// 내부: 이익·마진·MG·손익분기
close(col[0.05].cells.cps.profit, 2812500 - 3000000, "순수 CPS 5% 이익");
close(col[0.05].cells.cps.margin, (2812500 - 3000000) / 2812500, "순수 CPS 5% 마진");
close(out.internal.mgBep, 3000000, "MG 손익분기 = 월 운영비");
close(out.internal.mgTarget, 4000000, "MG 목표 마진 = 운영비 ÷ (1 − 25%)");
close(out.internal.leanBepRate, 0.1, "1단계 손익분기 수수료율 = 운영비 ÷ 광고비");
close(out.internal.leanTargetRate, 3000000 / (30000000 * 0.75), "1단계 목표 마진 수수료율");
close(out.internal.cpsBepRate, 3000000 / (out.leads * 61875), "순수 CPS 손익분기 전환율");
close(out.internal.cpsTargetRate, out.internal.cpsBepRate / 0.75, "순수 CPS 목표 마진 전환율");
// 목표 마진을 정확히 맞추는 CPS로 계산하면 마진이 목표와 같다.
const need = out.internal.requiredCps.find((r) => r.rate === 0.08).cps;
close((need * col[0.08].sales - 3000000) / (need * col[0.08].sales), 0.25, "필요 CPS 역산 검증");
// 하이브리드 손익분기: 그 전환율에서 수취액 = 운영비
const hb = out.internal.hybridBepRate;
close(out.hybridBase + out.cpsHybrid * out.leads * hb, 3000000, "하이브리드 손익분기 전환율에서 수취액 = 운영비");

// 최소 보장(MG): 순수 CPS 수취액의 하한
const withMg = calc.analyze({ ...base, mg: 3300000 });
const mgCol = Object.fromEntries(withMg.columns.map((c) => [c.rate, c]));
close(mgCol[0.05].cells.cps.revenue, 3300000, "MG가 변동 수취액보다 크면 MG");
close(mgCol[0.12].cells.cps.revenue, 6750000, "MG가 작으면 변동 수취액");
close(mgCol[0.05].cells.hybrid.revenue, 3375000, "MG는 순수 CPS에만 적용");

// 광고주 순수익(선택 입력)
const adv = calc.analyze({ ...base, advValue: 500000 });
const advCol = Object.fromEntries(adv.columns.map((c) => [c.rate, c]));
close(advCol[0.08].cells.flat.advNet, advCol[0.08].sales * 500000 - 30000000 - 4500000, "광고주 순수익");
check(col[0.08].cells.flat.advNet, null, "광고주 수익을 안 넣으면 계산하지 않는다");

// 내부 보기를 끄면 대행사 손익은 아예 계산하지 않는다.
const pub = calc.analyze({ ...base, internal: false });
check(pub.internal, null, "내부 보기 꺼짐 → 내부 요약 없음");
check(pub.columns.every((c) => Object.values(c.cells).every((x) => x.profit === null && x.margin === null)), true, "내부 보기 꺼짐 → 이익·마진 없음");

// 선택 입력을 비우면 해당 구조만 비운다.
const partial = calc.analyze({ ...base, leanRate: null, hybridBaseRate: null });
check(partial.columns[0].cells.lean.revenue, null, "1단계 수수료율 없음");
check(partial.columns[0].cells.hybrid.revenue, null, "기본료율 없음");
check(partial.columns[0].cells.cps.revenue !== null, true, "순수 CPS는 그대로");

// 기준 전환율이 목록에 없으면 열이 추가된다.
check(calc.analyze({ ...base, baseRate: 0.1 }).columns.map((c) => c.rate), [0.05, 0.08, 0.1, 0.12], "기준 열 추가");

// 검증
check(calc.validate({ ...base, spend: null }).length, 1, "광고비 필수");
check(calc.validate({ ...base, cpa: 0 }).length, 1, "CPA 0 불가");
check(calc.validate({ ...base, baseRate: 0 }).length, 1, "기준 전환율 0 불가");
check(calc.validate({ ...base, hybridBaseRate: 0.15 }).length, 1, "기본료율 ≥ 기준 수수료율 불가");
check(calc.validate({ ...base, targetMargin: 1 }).length, 1, "목표 마진 100% 불가");
check(calc.validate({ ...base, rates: [0] }).length, 1, "민감도 전환율 0 불가");
check(calc.analyze({ ...base, spend: null }).ok, false, "검증 실패면 계산하지 않는다");
check(calc.validate({ ...base, internal: false, targetMargin: 5, ops: -1 }), [], "내부 보기가 꺼져 있으면 내부 입력은 검증하지 않는다");

// 설정: 사용자가 정한 값만 기본값이다.
check(config.defaults.scenarioRates, [0.05, 0.08, 0.12], "민감도 5·8·12%");
check(config.defaults.referenceFeeRate, 0.15, "기준 수수료 15%");
check(config.defaults.targetMargin, 0.25, "목표 마진 25%");
["spend", "cpa", "baseRate", "leanRate", "hybridBaseRate", "ops", "mg"].forEach((k) => check(k in config.defaults, false, `기본값 없음: ${k}`));
check(config.structures.map((s) => s.key), ["flat", "lean", "hybrid", "cps"], "구조 4종");

// lead-cpa-guide 연계: 업종 참고 단가 원천이 있고 인터넷가입·대출이 들어 있다.
const items = guide.categories.flatMap((c) => c.groups.flatMap((g) => g.items.map((i) => i.name)));
check(["인터넷가입", "대출"].every((n) => items.includes(n)), true, "lead-cpa-guide에 인터넷가입·대출 단가가 있다");
close(guide.inflationRate, 0.1, "참고가 조정률은 lead-cpa-guide 설정을 따른다");

// 공개 저장소 규칙 — 입력값을 밖으로 내보내는 경로가 없어야 한다.
const dir = path.join(__dirname, "..", "lead-cps-calculator");
const source = ["index.html", "calculator.js", "cps-config.js"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
for (const forbidden of ["localStorage", "sessionStorage", "URLSearchParams", "fetch(", "XMLHttpRequest", "<form", "innerHTML", "location.hash", "indexedDB", "sendBeacon"]) {
  check(source.includes(forbidden), false, `입력값 유출 경로 없음: ${forbidden}`);
}

console.log(`lead-cps-calculator: ${checks} checks passed`);
