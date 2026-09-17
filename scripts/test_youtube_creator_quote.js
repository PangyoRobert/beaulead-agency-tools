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

console.log("YouTube creator quote rules: 31 assertions passed.");
