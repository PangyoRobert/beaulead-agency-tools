(function attachDevelopmentQuoteEngine(root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  if (root) root.DEVELOPMENT_QUOTE_ENGINE = engine;
})(typeof window !== "undefined" ? window : globalThis, function createEngine() {
  function classifyGeneral(input, config) {
    if (input.fullRestructure || input.sections >= 4) {
      return { key: "large", ...config.general.large };
    }
    if (input.sections >= 2) {
      return { key: "medium", ...config.general.medium };
    }
    if (input.layoutChange || input.textLines >= 5 || input.images >= 4) {
      return { key: "small", ...config.general.small };
    }
    return { key: "simple", ...config.general.simple };
  }

  function selectProduct(input, config) {
    if (input.scope === "detail" && input.detailType === "fullEdit") {
      return { key: "fullEdit", ...config.detail.fullEdit };
    }
    if (input.scope === "detail" && input.detailType === "newPage") {
      return { key: "newPage", ...config.detail.newPage };
    }
    return classifyGeneral(input, config);
  }

  function calculate(input, config) {
    const product = selectProduct(input, config);
    const includedRevisions = product.includedRevisions || 1;
    const eligibleUrgent = ["medium", "large", "fullEdit", "newPage"].includes(product.key);
    const urgentApplied = eligibleUrgent && Boolean(input.urgent);
    const extraRevisions = Math.max(0, input.requestedRevisions - includedRevisions);
    const base = product.price;
    const urgentFee = urgentApplied ? base * (config.urgentMultiplier - 1) : 0;
    const revisionFee = extraRevisions * base * config.additionalRevisionRate;

    const adjustmentAmount = Math.max(0, Number(input.adjustmentAmount) || 0);
    const adjustmentReason = String(input.adjustmentReason || "").trim();
    const adjustmentRequested = adjustmentAmount > 0;
    const adjustmentSign = input.adjustmentType === "discount" ? -1 : 1;
    const adjustmentApproved = adjustmentRequested && input.managerApproved && Boolean(adjustmentReason);
    const approvedAdjustment = adjustmentApproved ? adjustmentAmount * adjustmentSign : 0;

    const subtotal = Math.max(0, base + urgentFee + revisionFee + approvedAdjustment);
    const vat = subtotal * config.vatRate;
    const reasons = [];
    let status = product.status;

    if (status === "review") reasons.push(`${product.label}은 작업 범위 확인 후 최종 견적이 확정됩니다.`);
    if (input.extraDevelopment) {
      status = "consult";
      reasons.push("추가 기능 개발비는 현재 예상금액에 포함되지 않았습니다.");
    }
    if (adjustmentRequested && !input.managerApproved) reasons.push("수동 금액 조정이 관리자 승인 대기 중입니다.");
    if (adjustmentRequested && input.managerApproved && !adjustmentReason) reasons.push("수동 조정 사유를 입력해야 합계에 반영됩니다.");

    return {
      product,
      includedRevisions,
      eligibleUrgent,
      urgentApplied,
      extraRevisions,
      base,
      urgentFee,
      revisionFee,
      adjustmentRequested,
      adjustmentApproved,
      approvedAdjustment,
      subtotal,
      vat,
      total: subtotal + vat,
      status,
      reasons
    };
  }

  return Object.freeze({ classifyGeneral, selectProduct, calculate });
});
