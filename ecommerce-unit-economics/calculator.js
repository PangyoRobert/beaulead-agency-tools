// 번들 손익 계산. 입력이 같으면 결과가 항상 같은 회계 항등식만 쓴다.
//
// 채택하지 않은 것(괴리가 커서 뺐다): 재구매·LTV 기반 CAC, 소진 주기 기반 대량번들 제한,
// 번들마다 같은 CPA 를 가정하는 최종 마진, 반품·취소율. 이 계산은 **반품·취소를 반영하지
// 않는다(0% 가정)**. 화면도 결과 옆에 그 전제를 항상 적는다.
//
// 금액 기준: 모든 금액은 부가세(VAT)를 포함한 금액이다 (2026-10-08 사용자 결정).
// - 판매가는 소비자가 내는 결제금액, 상품값·물류비·광고비(CPA)는 영수증·광고 관리자에 보이는 금액
//   그대로 넣는다. 부가세를 따로 빼는 환산은 하지 않는다.
// - PG 수수료는 결제금액에 곱한다.
// - 이 방식은 사용자 시트의 계산과 같다. 부가세를 따로 빼지 않으므로, 모든 금액에 부가세가 들어
//   있을 때 남는 돈(CM1)은 부가세를 뺀 값보다 대체로 약 10% 크게 나온다(납부할 부가세만큼).
(function attachEcommerceEconomicsCalculator(root, factory) {
  const calculator = factory();
  if (typeof module === "object" && module.exports) module.exports = calculator;
  if (root) root.ECOMMERCE_ECONOMICS_CALCULATOR = calculator;
})(typeof window !== "undefined" ? window : globalThis, function createCalculator() {
  const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

  /** 입력 문제를 한국어 문장 배열로 돌려준다. 문제가 없으면 빈 배열. 던지지 않는다. */
  function validateInput(input) {
    const issues = [];
    if (!input || typeof input !== "object") return ["입력값이 없습니다."];
    if (!isNumber(input.unitPrice) || input.unitPrice <= 0) issues.push("판매가는 0보다 커야 합니다.");
    if (!isNumber(input.unitCogs) || input.unitCogs < 0) issues.push("원가는 0 이상이어야 합니다.");
    if (!isNumber(input.shippingPerBox) || input.shippingPerBox < 0) issues.push("물류비는 0 이상이어야 합니다.");
    if (!isNumber(input.pgRate) || input.pgRate < 0 || input.pgRate >= 1) {
      issues.push("PG 수수료율은 0% 이상 100% 미만이어야 합니다.");
    }
    if (!isNumber(input.targetMinMargin) || input.targetMinMargin < 0) issues.push("목표 최소 마진은 0 이상이어야 합니다.");
    if (!isNumber(input.consumptionMonths) || input.consumptionMonths <= 0) issues.push("소진 주기는 0보다 커야 합니다.");
    const t = input.thresholds;
    if (!t || !isNumber(t.aovFloor) || t.aovFloor < 0) issues.push("결제금액 하한은 0 이상이어야 합니다.");
    if (!t || !isNumber(t.marginFloor) || t.marginFloor < 0) issues.push("CM1 하한은 0 이상이어야 합니다.");
    if (!t || !isNumber(t.cm1RateFloor) || t.cm1RateFloor < 0 || t.cm1RateFloor > 1) {
      issues.push("CM1율 하한은 0% 이상 100% 이하여야 합니다.");
    }
    const cpa = input.cpaByBundle || {};
    Object.keys(cpa).forEach((id) => {
      const value = cpa[id];
      if (value !== null && value !== undefined && (!isNumber(value) || value < 0)) {
        issues.push("광고 CPA는 비우거나 0 이상이어야 합니다.");
      }
    });
    return Array.from(new Set(issues));
  }

  function calculateBundle(input, bundle) {
    const totalQty = bundle.paidQty + bundle.freeQty;
    const grossSales = input.unitPrice * bundle.paidQty;
    const totalCogs = input.unitCogs * totalQty;
    const pgFee = grossSales * input.pgRate;
    const shipping = input.shippingPerBox;
    const shippingPerUnit = shipping / totalQty;

    const cm1 = grossSales - totalCogs - pgFee - shipping;
    const cm1Rate = cm1 / grossSales;
    // 공헌이익이 0 이하면 광고비를 한 푼도 쓸 수 없다. 음수 한계선을 내보내지 않는다.
    const beRoas = cm1 > 0 ? grossSales / cm1 : null;
    const maxCpaRaw = cm1 - input.targetMinMargin;
    const maxCpa = maxCpaRaw > 0 ? maxCpaRaw : null;

    const cpaInput = input.cpaByBundle ? input.cpaByBundle[bundle.id] : null;
    const cpa = isNumber(cpaInput) ? cpaInput : null;
    const finalMargin = cpa === null ? null : cm1 - cpa;

    const t = input.thresholds;
    const byAov = grossSales >= t.aovFloor;
    const byMargin = cm1 >= t.marginFloor;

    return Object.freeze({
      id: bundle.id,
      label: bundle.label,
      paidQty: bundle.paidQty,
      freeQty: bundle.freeQty,
      totalQty,
      grossSales,
      discountRate: bundle.freeQty / totalQty,
      totalCogs,
      cogsRate: totalCogs / grossSales,
      pgFee,
      shipping,
      shippingPerUnit,
      shippingSavingPerUnit: shipping - shippingPerUnit,
      cm1,
      cm1Rate,
      beRoas,
      maxCpa,
      cpa,
      finalMargin,
      consumptionMonths: input.consumptionMonths * totalQty,
      // 제1법칙: 결제금액이 하한 이상이거나, CM1 이 하한 이상이면 통과.
      rule1: Object.freeze({ pass: byAov || byMargin, byAov, byMargin }),
      // 제3법칙: 광고 전 공헌마진율(CM1율)이 하한 이상이면 통과.
      rule3: Object.freeze({ pass: cm1Rate >= t.cm1RateFloor })
    });
  }

  function calculateAll(input, config) {
    const issues = validateInput(input);
    if (issues.length) throw new Error(issues.join(" "));
    if (!config || !Array.isArray(config.bundles)) {
      throw new Error("설정에 bundles 가 필요합니다.");
    }
    return Object.freeze(config.bundles.map((bundle) => calculateBundle(input, bundle)));
  }

  return Object.freeze({ validateInput, calculateAll });
});
