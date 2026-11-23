// 공급가 금액 → 보장 조회수 환산. 기준점은 pricing-config.js 의 packages 3종이다.
// 기준점 사이는 구간별 직선 보간이라, 패키지 금액을 넣으면 패키지 보장 조회수가 정확히 나온다.
// 최저가 미만·최고가 초과는 연장하지 않고 범위 밖으로 돌려준다(새 단가를 만들지 않기 위해서다).
// 조회수는 내림한다. 약정보다 많이 말하지 않기 위해서다.
window.YoutubeViewCalculator = Object.freeze({
  bounds(config) {
    const prices = config.packages.map((plan) => plan.supplyPrice);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  },

  calculate(config, amount) {
    const plans = config.packages.slice().sort((a, b) => a.supplyPrice - b.supplyPrice);
    const { min, max } = this.bounds(config);
    if (!Number.isFinite(amount)) return { status: "invalid" };
    if (amount < min) return { status: "below", min };
    if (amount > max) return { status: "above", max };

    let index = 0;
    while (index < plans.length - 2 && amount > plans[index + 1].supplyPrice) index += 1;
    const lo = plans[index];
    const hi = plans[index + 1];
    const ratio = (amount - lo.supplyPrice) / (hi.supplyPrice - lo.supplyPrice);
    const lerp = (a, b) => a + (b - a) * ratio;

    return {
      status: "ok",
      supplyPrice: amount,
      vatIncluded: Math.round(amount * (1 + config.vatRate)),
      views: Math.floor(lerp(lo.guaranteedViews, hi.guaranteedViews) + 1e-9),
      impressionsMin: Math.floor(lerp(lo.impressionsMin, hi.impressionsMin) + 1e-9),
      impressionsMax: Math.floor(lerp(lo.impressionsMax, hi.impressionsMax) + 1e-9)
    };
  }
});
