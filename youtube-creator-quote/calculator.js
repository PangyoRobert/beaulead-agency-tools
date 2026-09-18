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
    // 명수와 무관하게 한 번 나가는 비용(영상 제작비·대행 수수료 등).
    // 넣지 않으면 0이고, 그때 결과는 고정비 도입 전과 완전히 같다.
    const fixedCost = input.fixedCost === undefined ? 0 : input.fixedCost;

    assertPositive(targetRoas, "Target ROAS");
    assertPositive(averageOrderValue, "Average order value");
    assertRate(commissionRate);

    if (typeof supportFee !== "number" || !Number.isFinite(supportFee) || supportFee < 0) {
      throw new Error("Support fee must be zero or a positive number");
    }
    if (typeof fixedCost !== "number" || !Number.isFinite(fixedCost) || fixedCost < 0) {
      throw new Error("Fixed cost must be zero or a positive number");
    }
    if (!Number.isInteger(creatorCount) || creatorCount < 1) {
      throw new Error("Creator count must be a positive integer");
    }
    // 지출이 전혀 없으면 ROAS 가 정의되지 않는다(0 으로 나눈다).
    if (supportFee * creatorCount + fixedCost <= 0) {
      throw new Error("Total outlay must be greater than zero");
    }

    const denominator = 1 / targetRoas - commissionRate;
    if (denominator <= 0) {
      throw new Error("Target ROAS is unreachable at this commission rate");
    }

    // 고정비는 명수로 나눠 1인당 지출에 얹는다. 그래서 고정비가 있으면
    // 1인당 필요 매출이 더는 명수와 무관하지 않고, 사람이 늘수록 내려간다.
    const outlayPerCreator = supportFee + fixedCost / creatorCount;
    const revenuePerCreator = outlayPerCreator / denominator;
    const unitsPerCreator = revenuePerCreator / averageOrderValue;
    const totalRevenue = revenuePerCreator * creatorCount;
    const totalSupportFee = supportFee * creatorCount;
    const totalCommission = totalRevenue * commissionRate;
    const totalCost = fixedCost + totalSupportFee + totalCommission;

    return Object.freeze({
      targetRoas,
      creatorCount,
      supportFee,
      fixedCost,
      commissionRate,
      averageOrderValue,
      ceilingRoas: ceilingRoas(commissionRate),
      outlayPerCreator,
      revenuePerCreator,
      unitsPerCreator,
      totalRevenue,
      totalSupportFee,
      totalCommission,
      totalCost,
      // 검산값. 입력한 목표 ROAS와 같아야 한다.
      impliedRoas: totalCost === 0 ? Infinity : totalRevenue / totalCost,
      scopeNotice: scopeNotice(config, fixedCost)
    });
  }

  // 분모에 무엇이 들어갔는지는 고정비 입력 여부에 따라 달라진다. 화면에 늘
  // 같은 문구를 띄우면 둘 중 한 경우에는 거짓말이 된다.
  function scopeNotice(config, fixedCost) {
    if (!config) return "";
    if (fixedCost > 0 && config.roasScopeNoticeWithFixedCost) {
      return config.roasScopeNoticeWithFixedCost;
    }
    return config.roasScopeNotice || "";
  }

  /** 예산에서 명수를 거꾸로 푼다.
   *
   * 정방향은 명수를 받아 총액을 내지만, 영업에서 먼저 정해지는 쪽은 보통
   * 예산이다. "4,500만원이면 몇 명"에 답하려고 같은 식을 n 에 대해 푼 것이다.
   *
   *   총비용 B = 고정비 K + 지원비 F x n + 수수료율 c x 총매출
   *   총매출 = ROAS x B      (ROAS 의 정의)
   *   => B = K + F x n + c x ROAS x B
   *   => n = ( B x (1 - c x ROAS) - K ) / F
   *
   * 수수료를 예산만으로 표현할 수 있어서 미지수가 n 하나만 남는다. 그래서
   * 반복 계산이나 근사 없이 나눗셈 한 번으로 끝난다.
   *
   * `budget` 은 총 비용(지원비 + CPS 수수료 + 고정비)이다. 선집행 예산이나
   * 목표 매출이 아니다 - 섞으면 답이 몇 배씩 달라진다.
   */
  function solveCreatorCount(input, config) {
    const budget = input.budget;
    const targetRoas = input.targetRoas;
    const supportFee = input.supportFee;
    const commissionRate = input.commissionRate;
    const fixedCost = input.fixedCost === undefined ? 0 : input.fixedCost;

    assertPositive(budget, "Budget");
    assertPositive(targetRoas, "Target ROAS");
    assertRate(commissionRate);
    if (typeof fixedCost !== "number" || !Number.isFinite(fixedCost) || fixedCost < 0) {
      throw new Error("Fixed cost must be zero or a positive number");
    }
    // 지원비가 0 이면 사람을 늘려도 비용이 늘지 않아 명수가 결정되지 않는다.
    if (typeof supportFee !== "number" || !Number.isFinite(supportFee) || supportFee <= 0) {
      throw new Error("Support fee must be greater than zero to solve for a creator count");
    }

    // 1 - c x ROAS <= 0 은 1/ROAS - c <= 0 과 같은 조건이다. 정방향과 같은 상한.
    const slack = 1 - commissionRate * targetRoas;
    if (slack <= 0) {
      throw new Error("Target ROAS is unreachable at this commission rate");
    }

    // 예산에서 수수료 몫과 고정비를 떼고 남는 돈이 지원비로 갈 수 있는 전부다.
    const supportBudget = budget * slack - fixedCost;
    if (supportBudget <= 0) {
      throw new Error("Budget does not cover the fixed cost");
    }

    const exactCount = supportBudget / supportFee;
    const creatorCount = Math.floor(exactCount);
    if (creatorCount < 1) {
      throw new Error("Budget affords fewer than one creator");
    }

    // 명수는 정수로 내리므로 실제 집행액은 예산보다 조금 적다. 그 차액을 밝힌다.
    const plan = calculate({ ...input, fixedCost, creatorCount }, config);
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
