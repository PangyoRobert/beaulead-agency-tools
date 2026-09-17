(function attachYoutubeCreatorCalculator(root, factory) {
  const calculator = factory();
  if (typeof module === "object" && module.exports) module.exports = calculator;
  if (root) root.YOUTUBE_CREATOR_CALCULATOR = calculator;
})(typeof window !== "undefined" ? window : globalThis, function createCalculator() {
  // 목표 ROAS가 이 값 이상이면 지원비가 0원이어도 도달할 수 없다.
  // 총비용에 매출 x 수수료율이 항상 포함되므로 ROAS < 1 / 수수료율 이다.
  function ceilingRoas(commissionRate) {
    assertRate(commissionRate);
    return 1 / commissionRate;
  }

  function assertRate(commissionRate) {
    if (typeof commissionRate !== "number" || !Number.isFinite(commissionRate)) {
      throw new Error("Commission rate must be a finite number");
    }
    if (commissionRate <= 0 || commissionRate >= 1) {
      throw new Error("Commission rate must be between 0 and 1");
    }
  }

  function assertPositive(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be a positive number`);
    }
  }

  function calculate(input, config) {
    const targetRoas = input.targetRoas;
    const supportFee = input.supportFee;
    const commissionRate = input.commissionRate;
    const averageOrderValue = input.averageOrderValue;
    const creatorCount = input.creatorCount;

    assertPositive(targetRoas, "Target ROAS");
    assertPositive(averageOrderValue, "Average order value");
    assertRate(commissionRate);

    if (typeof supportFee !== "number" || !Number.isFinite(supportFee) || supportFee < 0) {
      throw new Error("Support fee must be zero or a positive number");
    }
    if (!Number.isInteger(creatorCount) || creatorCount < 1) {
      throw new Error("Creator count must be a positive integer");
    }

    const denominator = 1 / targetRoas - commissionRate;
    if (denominator <= 0) {
      throw new Error("Target ROAS is unreachable at this commission rate");
    }

    const revenuePerCreator = supportFee / denominator;
    const unitsPerCreator = revenuePerCreator / averageOrderValue;
    const totalRevenue = revenuePerCreator * creatorCount;
    const totalSupportFee = supportFee * creatorCount;
    const totalCommission = totalRevenue * commissionRate;
    const totalCost = totalSupportFee + totalCommission;

    return Object.freeze({
      targetRoas,
      creatorCount,
      supportFee,
      commissionRate,
      averageOrderValue,
      ceilingRoas: ceilingRoas(commissionRate),
      revenuePerCreator,
      unitsPerCreator,
      totalRevenue,
      totalSupportFee,
      totalCommission,
      totalCost,
      // 검산값. 입력한 목표 ROAS와 같아야 한다.
      impliedRoas: totalCost === 0 ? Infinity : totalRevenue / totalCost,
      scopeNotice: config && config.roasScopeNotice ? config.roasScopeNotice : ""
    });
  }

  return Object.freeze({ calculate, ceilingRoas });
});
