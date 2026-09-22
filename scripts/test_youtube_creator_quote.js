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

// 기준 시나리오: 목표 ROAS 3, 지원비 15만원, 카페24 5%, CPS 15%, 객단가 5만원, 30명
const result = calculator.calculate(base, config);
near(result.outlayPerCreator, 157500, "1인당 지출 = 지원비 15만 x 1.05");
near(result.revenuePerCreator, 859090.9091, "1인당 필요 매출");
near(result.unitsPerCreator, 17.1818, "1인당 필요 판매수량");
near(result.totalRevenue, 25772727.2727, "총 매출");
assert.equal(result.totalSupportFee, 4500000);
assert.equal(result.cafe24Fee, 225000, "지원비 총액 450만원의 5%");
near(result.totalCommission, 3865909.0909, "총 CPS 수수료");
near(result.totalCost, 8590909.0909, "총 비용 = 지원비 + 카페24 + CPS");

// 검산: 총 매출 / 총 비용 은 입력한 목표 ROAS 와 같아야 한다.
near(result.impliedRoas, base.targetRoas, "검산 ROAS");

// ── 카페24 수수료 ───────────────────────────────────────────────────
// 과세 기준은 지원비 총액(지원비 x 명수)이다. 매출도 총 비용도 아니다.
assert.equal(result.cafe24Fee, result.totalSupportFee * config.cafe24FeeRate);
assert.equal(config.cafe24FeeRate, 0.05, "사용자 확정 5%");
assert.equal(result.cafe24FeeRate, 0.05, "결과에도 적용된 요율을 싣는다");

// 지원비에 비례하므로 명수가 늘어도 1인당 부담이 그대로다. 명수로 나눠 지는
// 고정비였다면 여기서 값이 갈렸을 것이다.
const small = calculator.calculate({ ...base, creatorCount: 20 }, config);
const large = calculator.calculate({ ...base, creatorCount: 40 }, config);
near(small.outlayPerCreator, large.outlayPerCreator, "명수 변동 시 1인당 지출 불변");
near(small.revenuePerCreator, large.revenuePerCreator, "명수 변동 시 1인당 매출 불변");
near(small.unitsPerCreator, large.unitsPerCreator, "명수 변동 시 1인당 수량 불변");
near(small.impliedRoas, large.impliedRoas, "명수 변동 시 ROAS 불변");
near(large.totalRevenue, small.totalRevenue * 2, "총 매출은 명수에 비례");
assert.equal(large.totalSupportFee, small.totalSupportFee * 2);
assert.equal(large.cafe24Fee, small.cafe24Fee * 2, "카페24 수수료도 명수에 비례");

// 지원비가 오르면 수수료도 같은 비율로 오른다.
const pricier = calculator.calculate({ ...base, supportFee: 200000 }, config);
assert.equal(pricier.cafe24Fee, 300000, "지원비 20만 x 30명의 5%");
near(pricier.outlayPerCreator, 210000, "1인당 지출 = 지원비 20만 x 1.05");

// 수수료를 뺀 모델과 비교하면 필요 매출이 정확히 1.05 배다.
near(result.revenuePerCreator / (150000 / (1 / 3 - 0.15)), 1.05, "수수료가 붙은 만큼만 올라간다");

// 요율이 설정에 없으면 조용히 0 으로 넘어가지 않고 막는다.
assert.throws(() => calculator.calculate(base, {}), /Cafe24 fee rate/);
assert.throws(() => calculator.calculate(base, undefined), /Cafe24 fee rate/);
assert.throws(
  () => calculator.calculate(base, { cafe24FeeRate: 1 }),
  /Cafe24 fee rate/,
  "1 이상은 설정으로 인정하지 않는다"
);

// 수수료율이 정해지면 도달 가능한 ROAS 상한이 결정된다. 카페24 수수료는
// 매출이 아니라 지원비에 붙으므로 이 상한을 바꾸지 않는다.
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
// 지원비가 0 이면 지출 자체가 0 이라 ROAS 가 정의되지 않는다.
assert.throws(
  () => calculator.calculate({ ...base, supportFee: 0 }, config),
  /Total outlay/,
  "지원비가 0 이면 계산을 막아야 한다"
);

// 설정값은 사용자가 확정한 범위를 유지한다.
assert.equal(config.supportFee.min, 100000);
assert.equal(config.supportFee.max, 200000);
assert.equal(config.supportFee.default, 150000);
assert.equal(config.commissionRate.default, 0.15);
assert.ok(config.roasScopeNotice.includes("카페24 수수료"), "분모에 카페24 수수료가 있음을 밝힌다");
assert.ok(config.roasScopeNotice.includes("광고 매체비"), "빠진 비용도 함께 밝힌다");
assert.equal(result.scopeNotice, config.roasScopeNotice);

// 고정비는 이 계산기에서 사라졌다. 잔재가 남아 있으면 화면이 거짓말을 한다.
assert.equal(config.fixedCost, undefined, "고정비 설정이 남아 있으면 안 된다");
assert.equal(config.roasScopeNoticeWithFixedCost, undefined, "고정비용 문구도 남으면 안 된다");
assert.equal(result.fixedCost, undefined, "결과에 고정비 필드가 없어야 한다");
assert.ok(!config.roasScopeNotice.includes("영상 제작비"), "영상 제작비 언급은 제외한다");
assert.ok(!config.roasScopeNotice.includes("대행 수수료"), "대행 수수료 언급은 제외한다");
// 넘겨도 무시한다 — 옛 입력이 남아 있어도 조용히 금액을 바꾸지 않는다.
const stray = calculator.calculate({ ...base, fixedCost: 3000000 }, config);
near(stray.totalCost, result.totalCost, "fixedCost 를 넘겨도 결과가 달라지지 않는다");

// ── 예산 → 명수 역산 ────────────────────────────────────────────────
// B = (1 + r)*F*n + c*ROAS*B  →  n = B*(1 - c*ROAS) / ((1 + r)*F)
// 사람은 쪼갤 수 없으므로 내림하고, 그래서 남는 예산을 leftover 로 밝힌다.
const solved = calculator.solveCreatorCount({ ...base, budget: 10000000 }, config);
near(solved.exactCount, 34.9206, "정확해 명수");
assert.equal(solved.creatorCount, 34, "내림한 명수");
near(solved.totalCost, 9736363.6364, "실제 집행 총 비용");
near(solved.leftover, 263636.3636, "예산 잔액");
near(solved.totalRevenue, 29209090.9091, "필요 총 매출");
near(solved.totalUnits, 584.1818, "총 판매수량");
assert.equal(solved.cafe24Fee, 255000, "34명분 지원비 510만원의 5%");
near(solved.impliedRoas, base.targetRoas, "역산 결과도 목표 ROAS 를 만족한다");
assert.equal(solved.budget, 10000000);
assert.ok(solved.totalCost <= 10000000, "집행액이 예산을 넘지 않아야 한다");

// 수수료가 없었다면 36명이 나온다. 수수료가 명수를 실제로 깎는지 고정한다.
assert.ok(solved.creatorCount < 36, "카페24 수수료만큼 쓸 수 있는 명수가 줄어든다");

// 역산 결과를 정방향에 되먹이면 같은 값이 나와야 한다(양방향 검산).
const replay = calculator.calculate({ ...base, creatorCount: solved.creatorCount }, config);
near(replay.totalCost, solved.totalCost, "역산→정방향 총 비용 일치");
near(replay.revenuePerCreator, solved.revenuePerCreator, "역산→정방향 1인당 매출 일치");
near(replay.cafe24Fee, solved.cafe24Fee, "역산→정방향 카페24 수수료 일치");

// 막아야 하는 경우들
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
assert.throws(() => calculator.solveCreatorCount({ ...base, budget: 10000000 }, {}), /Cafe24 fee rate/);

console.log("YouTube creator quote rules: 71 assertions passed.");
