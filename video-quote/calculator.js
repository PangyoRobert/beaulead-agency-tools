(function attachVideoQuoteCalculator(root, factory) {
  const calculator = factory();
  if (typeof module === "object" && module.exports) module.exports = calculator;
  if (root) root.VIDEO_QUOTE_CALCULATOR = calculator;
})(typeof window !== "undefined" ? window : globalThis, function createCalculator() {
  function serviceLevel(levelId, config) {
    const level = config.serviceLevels.find((item) => item.id === levelId);
    if (!level) throw new Error("Unknown service level");
    return level;
  }

  function unitPrice(duration, level) {
    return duration.usesServiceLevel ? level.price : duration.price;
  }

  function quantityOf(source, id) {
    const raw = Number(source && source[id]);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.floor(raw);
  }

  function optionState(input, id) {
    const picked = input.options && input.options[id];
    if (!picked || picked.on !== true) return null;
    const raw = Number(picked.quantity);
    return { quantity: Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1 };
  }

  function calculate(input, config) {
    const level = serviceLevel(input.serviceLevel || config.defaultServiceLevel, config);

    const durationRows = [];
    let base = 0;
    let totalQuantity = 0;
    let levelCheckQuantity = 0;

    config.durations.forEach((duration) => {
      const quantity = quantityOf(input.quantities, duration.id);
      totalQuantity += quantity;
      if (quantity === 0) return;

      const amount = unitPrice(duration, level) * quantity;
      base += amount;
      if (duration.needsLevelCheck) levelCheckQuantity += quantity;

      const label = duration.usesServiceLevel
        ? `${duration.breakdownLabel} · ${level.label}`
        : duration.breakdownLabel;
      durationRows.push({ label: `${label} × ${quantity}`, amount, approx: false });
    });

    const discountApplied = totalQuantity >= config.volumeDiscount.minQuantity;
    const discount = discountApplied ? base * config.volumeDiscount.rate : 0;

    const optionRows = [];
    let optionTotal = 0;
    let approxCount = 0;

    config.options.forEach((option) => {
      const picked = optionState(input, option.id);
      if (!picked) return;

      const quantity = option.unit ? picked.quantity : 1;
      const amount = option.price * quantity;
      optionTotal += amount;
      if (option.approx) approxCount += 1;

      const suffix = `${option.unit ? ` × ${quantity}` : ""}${option.approx ? " (최소기준)" : ""}`;
      optionRows.push({ label: `${option.name}${suffix}`, amount, approx: option.approx });
    });

    const supply = base - discount + optionTotal;
    const vat = supply * config.vatRate;

    return Object.freeze({
      level,
      lines: durationRows.concat(optionRows),
      base,
      discount,
      discountApplied,
      optionTotal,
      supply,
      vat,
      total: supply + vat,
      totalQuantity,
      approxCount,
      // 금액에 "~" 를 붙일지는 최소 기준가 옵션이 하나라도 있는지로 정한다.
      approximate: approxCount > 0,
      summary: summarize(input, config),
      state: resolveState({ levelCheckQuantity, approxCount, level, config })
    });
  }

  function summarize(input, config) {
    const parts = config.durations
      .map((duration) => {
        const quantity = quantityOf(input.quantities, duration.id);
        return quantity > 0 ? `${duration.label} ${quantity}편` : null;
      })
      .filter(Boolean);
    return parts.join(" + ");
  }

  function resolveState({ levelCheckQuantity, approxCount, level, config }) {
    if (levelCheckQuantity > 0) {
      const state = config.states.levelCheck;
      return Object.freeze({
        tone: state.tone,
        label: state.label,
        title: state.title,
        body: `1분 영상 ${levelCheckQuantity}편을 ${level.label} 기준으로 계산했습니다. 레벨을 확정하면 최종 견적이 확정됩니다.`
      });
    }
    if (approxCount > 0) {
      const state = config.states.approx;
      return Object.freeze({
        tone: state.tone,
        label: state.label,
        title: state.title,
        body: `“~” 옵션 ${approxCount}건이 최소 기준가로 계산되었습니다. 실제 작업 범위 확인 후 금액을 확정합니다.`
      });
    }
    const state = config.states.ready;
    return Object.freeze({
      tone: state.tone,
      label: state.label,
      title: state.title,
      body: state.body
    });
  }

  return Object.freeze({ calculate });
});
