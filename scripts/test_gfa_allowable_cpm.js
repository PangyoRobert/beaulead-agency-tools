const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../gfa-allowable-cpm/gfa-config.js");
const calc = require("../gfa-allowable-cpm/calculator.js");
const config = global.GFA_ALLOWABLE_CPM_CONFIG;

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}
function close(actual, expected, message, tolerance = 1e-9) {
  assert.ok(typeof actual === "number" && Math.abs(actual - expected) < tolerance, `${message}: ${actual} != ${expected}`);
  checks += 1;
}

// 숫자 읽기
check(calc.parseNumber("1,047"), { value: 1047, decimals: 0, percent: false }, "쉼표");
check(calc.parseNumber("11,186원"), { value: 11186, decimals: 0, percent: false }, "원 표기");
check(calc.parseNumber("1.89%"), { value: 0.0189, decimals: 2, percent: true }, "퍼센트");
check(calc.parseNumber("abc"), null, "숫자 아님");
check(calc.parseNumber(""), null, "빈 칸");

// 정의서 §5 가상 예시 (목표 ROAS 200%)
const table = calc.parseTable(config.example.table, config);
check(table.headerFound, true, "헤더를 찾는다");
check(table.issues, [], "예시 표에는 문제가 없다");
check(table.rows.map((r) => r.name), ["유형 X", "유형 Y", "유형 Z1", "유형 Z2", "유형 Z 합계"], "행 이름");
const totals = calc.suggestTotals(table.rows);
check(totals, [false, false, false, false, true], "하위 행 합과 같은 합계 행만 자동 표시");

const out = calc.analyze({ rows: table.rows, totals, targetRoas: config.example.targetRoas, margin: null }, config);
const by = Object.fromEntries(out.results.map((r) => [r.name, r]));
close(by["유형 X"].metrics.cpm, 10000, "X CPM");
close(by["유형 X"].metrics.roas, 2.4, "X ROAS");
close(by["유형 X"].allowable.cpm, 12000, "X 허용 CPM", 1e-6);
check(by["유형 X"].verdict.label, "경계", "X: 여유처럼 보여도 N=30 오차폭(0.358) 안이라 경계");
close(by["유형 X"].verdict.e, 1.96 / Math.sqrt(30), "X 오차폭");
check(by["유형 Y"].verdict.label, "표본 부족", "Y: 구매 4건");
close(by["유형 Z1"].allowable.cpm, 3750, "Z 허용 CPM", 1e-6);
close(by["유형 Z1"].metrics.roas, 1.5, "Z ROAS");
check(by["유형 Z1"].verdict.label, "초과", "Z: 0.75 < 1 − 0.139");
close(by["유형 Z1"].needMultiple, 2 / 1.5, "Z 필요 배수 g ÷ ROAS");
check(by["유형 Z 합계"].isTotal, true, "합계 행 표시");
check(by["유형 Z 합계"].bottleneck, undefined, "합계 행에는 병목을 달지 않는다");
check(out.baseline.rows, 4, "기준은 합계 제외 4행");

// 항등식: CPM = CPC × CTR × 1000, ROAS = CVR × AOV ÷ CPC, 허용 CPM = 현재 CPM × ROAS ÷ g
out.results.forEach((r) => {
  const m = r.metrics;
  close(m.cpm, m.cpc * m.ctr * 1000, `${r.name} CPM 항등식`, 1e-6);
  close(m.roas, (m.cvr * m.aov) / m.cpc, `${r.name} ROAS 항등식`, 1e-9);
  if (r.allowable) close(r.allowable.cpm, (m.cpm * m.roas) / out.g, `${r.name} 허용 CPM = 현재 CPM × ROAS ÷ g`, 1e-6);
});

// 병목 로그 분해의 합이 ln(ROAS ÷ 기준 ROAS)와 일치
out.results.filter((r) => r.bottleneck).forEach((r) => {
  const sum = Object.values(r.bottleneck.terms).reduce((a, b) => a + b, 0);
  close(sum, Math.log(r.metrics.roas / out.baseline.metrics.roas), `${r.name} 병목 분해 합`, 1e-9);
  if (r.bottleneck.factor) assert.ok(r.bottleneck.terms[r.bottleneck.factor] < 0, "병목 항은 음수");
});
check(out.results.filter((r) => r.bottleneck && r.bottleneck.factor !== undefined).length >= 1, true, "병목이 계산되는 행이 있다");

// 합계를 체크하지 않으면 기준이 이중 계산된다(5행이 기준에 들어간다)
const noTotal = calc.analyze({ rows: table.rows, totals: [false, false, false, false, false], targetRoas: 200, margin: null }, config);
check(noTotal.baseline.rows, 5, "합계 체크가 없으면 5행이 기준");
// 행이 3개 미만이면 병목을 표시하지 않는다
const few = calc.analyze({ rows: table.rows.slice(0, 2), totals: [false, false], targetRoas: 200, margin: null }, config);
check(few.baseline, null, "기준 행 부족");
check(few.results.every((r) => r.bottleneck === undefined), true, "병목 표시 안 함");

// 판정 경계값
const th = config.thresholds, vd = config.verdicts;
const mk = (purchases, roas) => ({ row: { purchases }, metrics: { roas } });
const j = (p, roas, g = 2) => calc.judge({ purchases: p }, { roas }, g, th, vd).label;
check(j(29, 10), "표본 부족", "29건은 판정하지 않는다");
check(j(30, 10), "여유", "30건부터 판정");
check(j(100, 2 * (1 + 0.196) + 0.001), "여유", "q ≥ 1+e");
check(j(100, 2 * (1 + 0.196) - 0.001), "경계", "q < 1+e");
check(j(100, 2 * (1 - 0.196) + 0.001), "경계", "q > 1−e");
check(j(100, 2 * (1 - 0.196) - 0.001), "초과", "q ≤ 1−e");
check(calc.judge({ purchases: 100 }, { roas: null }, 2, th, vd).label, "계산 불가", "ROAS 없음");

// 0 분모·잘못된 입력
const zero = calc.derive({ spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 });
check(Object.values(zero).every((v) => v === null), true, "분모가 0이면 모두 null");
check(calc.allowable(zero, 2), null, "허용 상한도 null");
check(calc.validateInput({ targetRoas: null }).length, 1, "목표 ROAS 필수");
check(calc.validateInput({ targetRoas: 0 }).length, 1, "목표 ROAS 0 불가");
check(calc.validateInput({ targetRoas: 200, margin: 0 }).length, 1, "공헌이익률 0 불가");
check(calc.validateInput({ targetRoas: 200, margin: 0.4 }), [], "정상 입력");
const bad = calc.analyze({ rows: [{ name: "n", spend: 100, impressions: 10, clicks: 20, purchases: 5, revenue: 500, pasted: {} }], totals: [false], targetRoas: 200, margin: null }, config);
check(bad.results[0].problems, ["클릭이 노출보다 많습니다."], "클릭 > 노출");
check(bad.results[0].verdict.label, "계산 불가", "문제 행은 판정하지 않는다");

// 본전 ROAS 경고
const be = calc.analyze({ rows: table.rows, totals, targetRoas: 200, margin: 0.4 }, config);
close(be.breakEvenRoas, 2.5, "본전 ROAS = 1 ÷ m");
check(be.belowBreakEven, true, "g < 본전 ROAS 경고");

// 붙여넣은 계산 열 대조: 반올림 오차는 허용, 열 오염은 잡는다
const pastedTable = [
  ["이미지 유형", "광고비", "노출수", "평균 CPM", "클릭수", "CTR", "구매완료수", "구매완료 매출액", "구매완료 ROAS"].join("\t"),
  ["가상 유형", "22,078,032", "1,973,739", "11,186원", "37,307", "1.89%", "1,047", "43,418,180", "197%"].join("\t"),
  ["오염 유형", "22,078,032", "1,973,739", "9,999원", "37,307", "1.89%", "1,047", "43,418,180", "250%"].join("\t")
].join("\n");
const pasted = calc.parseTable(pastedTable, config);
const pastedOut = calc.analyze({ rows: pasted.rows, totals: [false, false], targetRoas: 200, margin: null }, config);
check(pastedOut.results[0].mismatches, [], "표시 자릿수 반올림은 불일치가 아니다");
check(pastedOut.results[1].mismatches, ["cpm", "roas"], "다른 열 값은 불일치로 알린다");

// 열 이름을 못 찾으면 안내한다
check(calc.parseTable("a\tb\n1\t2", config).headerFound, false, "헤더 없음");
check(calc.parseTable("a\tb\n1\t2", config).rows, [], "행 없음");

// 설정: 기본값 없음·기준값 구조
check(config.thresholds.minPurchases, 30, "최소 구매 수 30(확정)");
check(config.thresholds.z, 1.96, "z 1.96");
check("defaultTargetRoas" in config, false, "목표 ROAS 기본값은 설정에 없다");

// 공개 저장소 규칙 — 입력값을 밖으로 내보내는 경로가 없어야 한다.
const dir = path.join(__dirname, "..", "gfa-allowable-cpm");
const source = ["index.html", "calculator.js", "gfa-config.js"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
for (const forbidden of ["localStorage", "sessionStorage", "URLSearchParams", "fetch(", "XMLHttpRequest", "<form", "innerHTML", "location.hash", "indexedDB", "sendBeacon"]) {
  check(source.includes(forbidden), false, `입력값 유출 경로 없음: ${forbidden}`);
}

console.log(`gfa-allowable-cpm: ${checks} checks passed`);
