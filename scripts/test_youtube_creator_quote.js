const assert = require("node:assert/strict");

global.window = global;
require("../youtube-creator-quote/pricing-config.js");
const calculator = require("../youtube-creator-quote/calculator.js");
const config = global.YOUTUBE_CREATOR_CONFIG;

const near = (actual, expected, label) => {
  assert.ok(
    Math.abs(actual - expected) < 0.01,
    `${label}: expected ~${expected}, got ${actual}`
  );
};

const base = {
  targetRoas: 3,
  creatorCount: 30,
  supportFee: 150000,
  commissionRate: 0.15,
  averageOrderValue: 50000
};

// 기준 시나리오: 목표 ROAS 3, 지원비 15만원, CPS 15%, 객단가 5만원, 30명
const result = calculator.calculate(base, config);
near(result.revenuePerCreator, 818181.82, "1인당 필요 매출");
near(result.unitsPerCreator, 16.3636, "1인당 필요 판매수량");
near(result.totalRevenue, 24545454.55, "총 매출");
assert.equal(result.totalSupportFee, 4500000);
near(result.totalCommission, 3681818.18, "총 CPS 수수료");
near(result.totalCost, 8181818.18, "총 비용");

// 검산: 총 매출 / 총 비용 은 입력한 목표 ROAS 와 같아야 한다.
near(result.impliedRoas, base.targetRoas, "검산 ROAS");

// 명수는 1인당 지표와 ROAS 를 바꾸지 않는다. 총액만 비례한다.
const small = calculator.calculate({ ...base, creatorCount: 20 }, config);
const large = calculator.calculate({ ...base, creatorCount: 40 }, config);
near(small.revenuePerCreator, large.revenuePerCreator, "명수 변동 시 1인당 매출 불변");
near(small.unitsPerCreator, large.unitsPerCreator, "명수 변동 시 1인당 수량 불변");
near(small.impliedRoas, large.impliedRoas, "명수 변동 시 ROAS 불변");
near(large.totalRevenue, small.totalRevenue * 2, "총 매출은 명수에 비례");
assert.equal(large.totalSupportFee, small.totalSupportFee * 2);

// 수수료율이 정해지면 도달 가능한 ROAS 상한이 결정된다.
near(calculator.ceilingRoas(0.15), 6.6667, "CPS 15% ROAS 상한");
near(calculator.ceilingRoas(0.1), 10, "CPS 10% ROAS 상한");
near(calculator.ceilingRoas(0.2), 5, "CPS 20% ROAS 상한");

// 상한 이상은 계산하지 않고 막는다.
assert.throws(
  () => calculator.calculate({ ...base, targetRoas: 7 }, config),
  /unreachable/,
  "CPS 15% 에서 목표 ROAS 7 은 차단되어야 한다"
);
assert.throws(
  () => calculator.calculate({ ...base, targetRoas: 1 / 0.15 }, config),
  /unreachable/,
  "상한과 같은 값도 차단되어야 한다"
);

// 입력 검증
assert.throws(() => calculator.calculate({ ...base, targetRoas: 0 }, config), /Target ROAS/);
assert.throws(() => calculator.calculate({ ...base, averageOrderValue: 0 }, config), /Average order value/);
assert.throws(() => calculator.calculate({ ...base, creatorCount: 0 }, config), /Creator count/);
assert.throws(() => calculator.calculate({ ...base, creatorCount: 2.5 }, config), /Creator count/);
assert.throws(() => calculator.calculate({ ...base, supportFee: -1 }, config), /Support fee/);
assert.throws(() => calculator.calculate({ ...base, commissionRate: 0 }, config), /Commission rate/);
assert.throws(() => calculator.calculate({ ...base, commissionRate: 1 }, config), /Commission rate/);

// 설정값은 사용자가 확정한 범위를 유지한다.
assert.equal(config.supportFee.min, 100000);
assert.equal(config.supportFee.max, 200000);
assert.equal(config.supportFee.default, 150000);
assert.equal(config.commissionRate.default, 0.15);
assert.ok(config.roasScopeNotice.includes("광고 매체비"), "ROAS 범위 표기 문구가 있어야 한다");
assert.equal(result.scopeNotice, config.roasScopeNotice);

// ── 고정비 ──────────────────────────────────────────────────────────
// 넣지 않으면 고정비 도입 전과 결과가 완전히 같아야 한다(회귀 보증).
const withoutFixed = calculator.calculate({ ...base, fixedCost: 0 }, config);
near(withoutFixed.revenuePerCreator, result.revenuePerCreator, "고정비 0 은 기존 결과와 동일");
near(withoutFixed.totalCost, result.totalCost, "고정비 0 은 총 비용도 동일");
assert.equal(result.fixedCost, 0, "고정비를 넘기지 않으면 0 으로 취급한다");

// 고정비 300만원: 1인당 지출에 명수로 나눈 몫이 얹힌다.
const fixed = calculator.calculate({ ...base, fixedCost: 3000000 }, config);
near(fixed.outlayPerCreator, 250000, "1인당 지출 = 지원비 15만 + 고정비 300만/30명");
near(fixed.revenuePerCreator, 1363636.3636, "고정비 반영 1인당 필요 매출");
near(fixed.unitsPerCreator, 27.2727, "고정비 반영 1인당 필요 판매수량");
near(fixed.totalCost, 13636363.6364, "총 비용에 고정비가 더해진다");
assert.equal(fixed.fixedCost, 3000000);
// 고정비가 있어도 검산 ROAS 는 목표와 같아야 한다.
near(fixed.impliedRoas, base.targetRoas, "고정비 반영 후 검산 ROAS");

// 고정비가 있으면 1인당 지표는 더 이상 명수와 무관하지 않다 — 사람이 늘수록 내려간다.
const few = calculator.calculate({ ...base, creatorCount: 20, fixedCost: 3000000 }, config);
const many = calculator.calculate({ ...base, creatorCount: 60, fixedCost: 3000000 }, config);
near(few.revenuePerCreator, 1636363.6364, "20명 1인당 필요 매출");
near(many.revenuePerCreator, 1090909.0909, "60명 1인당 필요 매출");
assert.ok(
  many.revenuePerCreator < few.revenuePerCreator,
  "고정비가 있으면 명수가 늘수록 1인당 필요 매출이 줄어야 한다"
);
near(few.impliedRoas, many.impliedRoas, "명수가 달라도 목표 ROAS 는 달성된다");

// 분모에 무엇이 들어갔는지 알리는 문구가 고정비 유무에 따라 갈린다.
assert.equal(result.scopeNotice, config.roasScopeNotice);
assert.equal(fixed.scopeNotice, config.roasScopeNoticeWithFixedCost);
assert.ok(fixed.scopeNotice.includes("고정비"), "고정비 포함 문구여야 한다");
assert.notEqual(config.roasScopeNotice, config.roasScopeNoticeWithFixedCost);

// 고정비 입력 검증
assert.throws(() => calculator.calculate({ ...base, fixedCost: -1 }, config), /Fixed cost/);
assert.throws(() => calculator.calculate({ ...base, fixedCost: Number.NaN }, config), /Fixed cost/);
// 지출이 0 이면 ROAS 가 정의되지 않으므로 Infinity 를 뱉는 대신 막는다.
assert.throws(
  () => calculator.calculate({ ...base, supportFee: 0, fixedCost: 0 }, config),
  /Total outlay/,
  "지원비와 고정비가 모두 0 이면 계산을 막아야 한다"
);
// 지원비가 0 이어도 고정비가 있으면 계산된다.
const onlyFixed = calculator.calculate({ ...base, supportFee: 0, fixedCost: 3000000 }, config);
near(onlyFixed.outlayPerCreator, 100000, "지원비 0 · 고정비만 있을 때 1인당 지출");
near(onlyFixed.impliedRoas, base.targetRoas, "지원비 0 · 고정비만 있어도 목표 ROAS 달성");

// 고정비 기본값은 0 이다 — "아직 안 넣었다"는 뜻이지 확정된 금액이 아니다.
assert.equal(config.fixedCost.default, 0);
assert.ok(config.fixedCost.hint.length > 0, "고정비 입력 안내 문구가 있어야 한다");

// ── 예산 → 명수 역산 ────────────────────────────────────────────────
// B = K + F*n + c*ROAS*B  →  n = (B*(1 - c*ROAS) - K) / F
// 사람은 쪼갤 수 없으므로 내림하고, 그래서 남는 예산을 leftover 로 밝힌다.
const solved = calculator.solveCreatorCount({ ...base, budget: 10000000 }, config);
near(solved.exactCount, 36.6667, "정확해 명수");
assert.equal(solved.creatorCount, 36, "내림한 명수");
near(solved.totalCost, 9818181.8182, "실제 집행 총 비용");
near(solved.leftover, 181818.1818, "예산 잔액");
near(solved.totalRevenue, 29454545.4545, "필요 총 매출");
near(solved.totalUnits, 589.0909, "총 판매수량");
near(solved.impliedRoas, base.targetRoas, "역산 결과도 목표 ROAS 를 만족한다");
assert.equal(solved.budget, 10000000);
assert.ok(solved.totalCost <= 10000000, "집행액이 예산을 넘지 않아야 한다");

// 역산 결과를 정방향에 되먹이면 같은 값이 나와야 한다(양방향 검산).
const replay = calculator.calculate({ ...base, creatorCount: solved.creatorCount }, config);
near(replay.totalCost, solved.totalCost, "역산→정방향 총 비용 일치");
near(replay.revenuePerCreator, solved.revenuePerCreator, "역산→정방향 1인당 매출 일치");

// 고정비가 있으면 같은 예산으로 쓸 수 있는 사람이 줄고 1인당 부담이 커진다.
const solvedFixed = calculator.solveCreatorCount({ ...base, budget: 10000000, fixedCost: 2000000 }, config);
assert.equal(solvedFixed.creatorCount, 23, "고정비 200만원이면 23명");
near(solvedFixed.revenuePerCreator, 1292490.1186, "고정비가 있으면 1인당 부담이 커진다");
assert.ok(
  solvedFixed.creatorCount < solved.creatorCount,
  "고정비가 늘면 같은 예산으로 쓸 수 있는 명수가 줄어야 한다"
);
near(solvedFixed.impliedRoas, base.targetRoas, "고정비가 있어도 목표 ROAS 달성");

// 막아야 하는 경우들
assert.throws(
  () => calculator.solveCreatorCount({ ...base, budget: 10000000, fixedCost: 30000000 }, config),
  /cover the fixed cost/,
  "예산이 고정비를 못 덮으면 막는다"
);
assert.throws(
  () => calculator.solveCreatorCount({ ...base, budget: 10000000, targetRoas: 7 }, config),
  /unreachable/,
  "ROAS 상한 초과는 정방향과 같은 이유로 막는다"
);
assert.throws(
  () => calculator.solveCreatorCount({ ...base, budget: 10000000, supportFee: 0 }, config),
  /Support fee must be greater/,
  "지원비 0 이면 명수가 결정되지 않는다"
);
assert.throws(
  () => calculator.solveCreatorCount({ ...base, budget: 1000 }, config),
  /fewer than one creator/,
  "1명도 못 쓰는 예산은 막는다"
);
assert.throws(() => calculator.solveCreatorCount({ ...base, budget: 0 }, config), /Budget/);
assert.throws(() => calculator.solveCreatorCount({ ...base, budget: -1 }, config), /Budget/);

console.log("YouTube creator quote rules: 75 assertions passed.");
