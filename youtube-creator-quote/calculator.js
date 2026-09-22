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

  // 카페24 수수료율은 설정에서만 온다. 빠지면 0 으로 조용히 넘어가는 대신 막는다 —
  // 수수료가 빠진 견적은 틀렸다는 표시 없이 싸 보이기 때문이다.
  function cafe24Rate(config) {
    const rate = config && config.cafe24FeeRate;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate >= 1) {
      throw new Error("Cafe24 fee rate must be configured between 0 and 1");
    }
    return rate;
  }

  function calculate(input, config) {
    const targetRoas = input.targetRoas;
    const supportFee = input.supportFee;
    const commissionRate = input.commissionRate;
    const averageOrderValue = input.averageOrderValue;
    const creatorCount = input.creatorCount;
    const feeRate = cafe24Rate(config);

    assertPositive(targetRoas, "Target ROAS");
    assertPositive(averageOrderValue, "Average order value");
    assertRate(commissionRate);

    if (typeof supportFee !== "number" || !Number.isFinite(supportFee) || supportFee < 0) {
      throw new Error("Support fee must be zero or a positive number");
    }
    if (!Number.isInteger(creatorCount) || creatorCount < 1) {
      throw new Error("Creator count must be a positive integer");
    }
    // 지출이 전혀 없으면 ROAS 가 정의되지 않는다(0 으로 나눈다).
    if (supportFee * creatorCount <= 0) {
      throw new Error("Total outlay must be greater than zero");
    }

    const denominator = 1 / targetRoas - commissionRate;
    if (denominator <= 0) {
      throw new Error("Target ROAS is unreachable at this commission rate");
    }

    // 카페24 수수료는 지원비 총액에 붙으므로 1인당으로 내리면 지원비에 비례한
    // 상수가 된다. 그래서 1인당 지표는 여전히 명수와 무관하다.
    const outlayPerCreator = supportFee * (1 + feeRate);
    const revenuePerCreator = outlayPerCreator / denominator;
    const unitsPerCreator = revenuePerCreator / averageOrderValue;
    const totalRevenue = revenuePerCreator * creatorCount;
    const totalSupportFee = supportFee * creatorCount;
    const cafe24Fee = totalSupportFee * feeRate;
    const totalCommission = totalRevenue * commissionRate;
    const totalCost = totalSupportFee + cafe24Fee + totalCommission;

    return Object.freeze({
      targetRoas,
      creatorCount,
      supportFee,
      commissionRate,
      averageOrderValue,
      cafe24FeeRate: feeRate,
      ceilingRoas: ceilingRoas(commissionRate),
      outlayPerCreator,
      revenuePerCreator,
      unitsPerCreator,
      totalRevenue,
      totalSupportFee,
      cafe24Fee,
      totalCommission,
      totalCost,
      // 검산값. 입력한 목표 ROAS와 같아야 한다.
      impliedRoas: totalCost === 0 ? Infinity : totalRevenue / totalCost,
      scopeNotice: (config && config.roasScopeNotice) || ""
    });
  }

  /** 예산에서 명수를 거꾸로 푼다.
   *
   * 정방향은 명수를 받아 총액을 내지만, 영업에서 먼저 정해지는 쪽은 보통
   * 예산이다. "4,500만원이면 몇 명"에 답하려고 같은 식을 n 에 대해 푼 것이다.
   *
   *   총비용 B = 지원비 F x n + 카페24 수수료 r x F x n + 수수료율 c x 총매출
   *   총매출 = ROAS x B      (ROAS 의 정의)
   *   => B = (1 + r) x F x n + c x ROAS x B
   *   => n = B x (1 - c x ROAS) / ((1 + r) x F)
   *
   * CPS 수수료를 예산만으로 표현할 수 있어서 미지수가 n 하나만 남는다. 그래서
   * 반복 계산이나 근사 없이 나눗셈 한 번으로 끝난다.
   *
   * 카페24 수수료가 지원비에 비례하는 덕분에 n 이 한 항으로 묶인다. 명수와
   * 무관한 고정비였다면 상수항이 따로 남아 식이 달라진다.
   *
   * `budget` 은 총 비용(지원비 + 카페24 수수료 + CPS 수수료)이다. 선집행
   * 예산이나 목표 매출이 아니다 - 섞으면 답이 몇 배씩 달라진다.
   */
  function solveCreatorCount(input, config) {
    const budget = input.budget;
    const targetRoas = input.targetRoas;
    const supportFee = input.supportFee;
    const commissionRate = input.commissionRate;
    const feeRate = cafe24Rate(config);

    assertPositive(budget, "Budget");
    assertPositive(targetRoas, "Target ROAS");
    assertRate(commissionRate);
    // 지원비가 0 이면 사람을 늘려도 비용이 늘지 않아 명수가 결정되지 않는다.
    if (typeof supportFee !== "number" || !Number.isFinite(supportFee) || supportFee <= 0) {
      throw new Error("Support fee must be greater than zero to solve for a creator count");
    }

    // 1 - c x ROAS <= 0 은 1/ROAS - c <= 0 과 같은 조건이다. 정방향과 같은 상한.
    const slack = 1 - commissionRate * targetRoas;
    if (slack <= 0) {
      throw new Error("Target ROAS is unreachable at this commission rate");
    }

    // 예산에서 CPS 수수료 몫을 뗀 나머지가 지원비와 카페24 수수료로 갈 수 있는 전부다.
    const exactCount = (budget * slack) / (supportFee * (1 + feeRate));
    const creatorCount = Math.floor(exactCount);
    if (creatorCount < 1) {
      throw new Error("Budget affords fewer than one creator");
    }

    // 명수는 정수로 내리므로 실제 집행액은 예산보다 조금 적다. 그 차액을 밝힌다.
    const plan = calculate({ ...input, creatorCount }, config);
    return Object.freeze({
      ...plan,
      budget,
      exactCount,
      leftover: budget - plan.totalCost,
      totalUnits: plan.unitsPerCreator * creatorCount
    });
  }

  return Object.freeze({ calculate, ceilingRoas, solveCreatorCount });
});
