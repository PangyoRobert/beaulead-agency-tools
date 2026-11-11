// 리드 수집 대행 보수 구조 계산. 입력이 같으면 결과가 항상 같은 항등식만 쓴다.
//
// 가정: 광고비는 광고주가 부담한다. 대행사 비용은 월 운영비뿐이다.
//   유효 DB      = 광고비 ÷ CPA
//   확정 건수    = 유효 DB × 백엔드 전환율
//   고정 수수료  = 광고비 × 수수료율
//   순수 CPS     = 기준 수수료 ÷ 기준 전환율의 확정 건수      (기준 전환율에서 광고주 비용이 같다)
//   하이브리드   = 광고비 × 기본료율 + 하이브리드 CPS × 확정 건수
//                  하이브리드 CPS = (기준 수수료 − 기본료) ÷ 기준 전환율의 확정 건수
//   대행사 이익  = 수취액 − 월 운영비,  마진 = 이익 ÷ 수취액
(function attachLeadCpsCalculator(root, factory) {
  const calculator = factory();
  if (typeof module === "object" && module.exports) module.exports = calculator;
  if (root) root.LEAD_CPS_CALCULATOR = calculator;
})(typeof window !== "undefined" ? window : globalThis, function createCalculator() {
  const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
  const ratio = (a, b) => (isNumber(a) && isNumber(b) && b !== 0 ? a / b : null);

  /** 입력 검증. 한국어 문장 배열, 없으면 빈 배열. */
  function validate(input) {
    const issues = [];
    if (!isNumber(input.spend) || input.spend <= 0) issues.push("월 광고비를 0보다 크게 넣어 주세요.");
    if (!isNumber(input.cpa) || input.cpa <= 0) issues.push("유효 DB 단가(CPA)를 0보다 크게 넣어 주세요.");
    if (!isNumber(input.baseRate) || input.baseRate <= 0 || input.baseRate > 1) issues.push("기준 백엔드 전환율은 0%보다 크고 100% 이하여야 합니다.");
    if (!isNumber(input.refFeeRate) || input.refFeeRate <= 0) issues.push("기준 수수료율을 0보다 크게 넣어 주세요.");
    (input.rates || []).forEach((r) => {
      if (!isNumber(r) || r <= 0 || r > 1) issues.push("민감도 전환율은 0%보다 크고 100% 이하여야 합니다.");
    });
    if (isNumber(input.leanRate) && input.leanRate <= 0) issues.push("1단계 수수료율은 0%보다 커야 합니다.");
    if (isNumber(input.hybridBaseRate)) {
      if (input.hybridBaseRate < 0) issues.push("하이브리드 기본료율은 0% 이상이어야 합니다.");
      else if (isNumber(input.refFeeRate) && input.hybridBaseRate >= input.refFeeRate) issues.push("하이브리드 기본료율은 기준 수수료율보다 낮아야 건당 CPS가 남아요.");
    }
    if (input.internal) {
      if (isNumber(input.ops) && input.ops < 0) issues.push("월 운영비는 0 이상이어야 합니다.");
      if (isNumber(input.targetMargin) && (input.targetMargin <= 0 || input.targetMargin >= 1)) issues.push("목표 영업이익률은 0%보다 크고 100% 미만이어야 합니다.");
    }
    return issues;
  }

  /** 정렬·중복 제거한 시나리오 전환율. 기준 전환율이 목록에 없으면 함께 넣는다. */
  function scenarioRates(input) {
    const set = new Set((input.rates || []).filter(isNumber));
    if (isNumber(input.baseRate)) set.add(input.baseRate);
    return [...set].sort((a, b) => a - b);
  }

  function analyze(input) {
    const issues = validate(input);
    const out = { issues, ok: false };
    if (issues.length) return out;

    const leads = input.spend / input.cpa;
    const refFee = input.spend * input.refFeeRate;
    const salesBase = leads * input.baseRate;
    const cpsPure = ratio(refFee, salesBase);
    const hybridBase = isNumber(input.hybridBaseRate) ? input.spend * input.hybridBaseRate : null;
    const cpsHybrid = hybridBase === null ? null : ratio(refFee - hybridBase, salesBase);
    const leanFee = isNumber(input.leanRate) ? input.spend * input.leanRate : null;
    const mg = isNumber(input.mg) && input.mg > 0 ? input.mg : 0;
    const hasOps = input.internal && isNumber(input.ops);
    const m = isNumber(input.targetMargin) ? input.targetMargin : null;

    const revenue = {
      flat: () => refFee,
      lean: () => leanFee,
      hybrid: (sales) => (cpsHybrid === null ? null : hybridBase + cpsHybrid * sales),
      cps: (sales) => (cpsPure === null ? null : Math.max(cpsPure * sales, mg))
    };

    const rates = scenarioRates(input);
    const columns = rates.map((rate) => {
      const sales = leads * rate;
      const cells = {};
      Object.keys(revenue).forEach((key) => {
        const rev = revenue[key](sales);
        const cell = { revenue: rev, advCostPerSale: null, advNet: null, profit: null, margin: null };
        if (rev !== null) {
          cell.advCostPerSale = ratio(input.spend + rev, sales);
          if (isNumber(input.advValue)) cell.advNet = sales * input.advValue - input.spend - rev;
          if (hasOps) {
            cell.profit = rev - input.ops;
            cell.margin = ratio(cell.profit, rev);
          }
        }
        cells[key] = cell;
      });
      return { rate, sales, isBase: rate === input.baseRate, cells, adCostOnly: ratio(input.cpa, rate) };
    });

    const internal = hasOps ? {
      ops: input.ops,
      mgBep: input.ops,
      mgTarget: m === null ? null : input.ops / (1 - m),
      leanBepRate: input.ops / input.spend,
      leanTargetRate: m === null ? null : input.ops / (input.spend * (1 - m)),
      cpsBepRate: ratio(input.ops, leads * (cpsPure || 0)),
      hybridBepRate: cpsHybrid ? Math.max(0, (input.ops - hybridBase) / (leads * cpsHybrid)) : null,
      requiredCps: m === null ? null : columns.map((c) => ({ rate: c.rate, cps: ratio(input.ops / (1 - m), c.sales) }))
    } : null;
    if (internal) {
      internal.cpsTargetRate = m === null || internal.cpsBepRate === null ? null : internal.cpsBepRate / (1 - m);
    }

    return { issues, ok: true, leads, refFee, salesBase, cpsPure, cpsHybrid, hybridBase, leanFee, mg, columns, internal };
  }

  return { validate, scenarioRates, analyze, isNumber };
});
