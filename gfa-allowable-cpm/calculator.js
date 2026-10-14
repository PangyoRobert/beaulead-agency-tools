// GFA 허용 CPM 계산. 입력이 같으면 결과가 항상 같은 항등식만 쓴다(정의서 docs/gfa-allowable-cpm-calculator.md).
//
// 허용 CPM = CTR × CVR × 객단가 × 1,000 ÷ 목표 ROAS  (= 현재 CPM × 현재 ROAS ÷ 목표 ROAS)
// CTR·CVR·객단가는 그 행의 현재 값을 고정한 가정이다. 매출은 플랫폼 귀속값이다.
// 판정의 오차폭은 구매 수만 보는 근사(e = z ÷ √N)이고 객단가 변동·귀속 오차는 반영하지 않는다.
(function attachGfaAllowableCpmCalculator(root, factory) {
  const calculator = factory();
  if (typeof module === "object" && module.exports) module.exports = calculator;
  if (root) root.GFA_ALLOWABLE_CPM_CALCULATOR = calculator;
})(typeof window !== "undefined" ? window : globalThis, function createCalculator() {
  const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
  const squash = (value) => String(value == null ? "" : value).replace(/\s+/g, "");

  /** "1,047" "11,186원" "1.89%" → { value, decimals, percent }. 숫자가 아니면 null. */
  function parseNumber(raw) {
    const text = squash(raw).replace(/[,원₩]/g, "");
    const match = /^(-?\d+(?:\.(\d+))?)(%?)$/.exec(text);
    if (!match) return null;
    const percent = match[3] === "%";
    const number = Number(match[1]);
    return { value: percent ? number / 100 : number, decimals: match[2] ? match[2].length : 0, percent };
  }

  function findColumn(headers, aliases) {
    const wanted = aliases.map(squash);
    return headers.findIndex((header) => wanted.includes(squash(header)));
  }

  /**
   * 붙여넣은 탭 구분 표 → 행 목록. 헤더 행은 원자료 열 이름을 3개 이상 찾은 첫 줄.
   * 반환: { rows, issues, headerFound }. 던지지 않는다.
   */
  function parseTable(text, config) {
    const issues = [];
    const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim());
    const cells = lines.map((line) => line.split("\t"));
    const rawKeys = ["spend", "impressions", "clicks", "purchases", "revenue"];
    let headerIndex = -1;
    let map = null;
    for (let i = 0; i < cells.length && headerIndex < 0; i += 1) {
      const found = {};
      rawKeys.forEach((key) => { found[key] = findColumn(cells[i], config.columns[key]); });
      if (rawKeys.filter((key) => found[key] >= 0).length >= 3) { headerIndex = i; map = found; }
    }
    if (headerIndex < 0) {
      return { rows: [], issues: ["열 이름을 찾지 못했습니다. 광고비·노출수·클릭수·구매완료수·구매완료 매출액 열이 있는 표를 헤더째 붙여넣어 주세요."], headerFound: false };
    }
    rawKeys.filter((key) => map[key] < 0).forEach((key) => issues.push(`"${config.columns[key][0]}" 열을 찾지 못했습니다.`));
    const header = cells[headerIndex];
    const nameIndex = findColumn(header, config.columns.name);
    const checks = {};
    Object.keys(config.checkColumns).forEach((key) => { checks[key] = findColumn(header, config.checkColumns[key]); });

    const rows = [];
    cells.slice(headerIndex + 1).forEach((row, offset) => {
      const lineNo = headerIndex + 2 + offset;
      const name = (nameIndex >= 0 ? row[nameIndex] : row[0]) || `행 ${rows.length + 1}`;
      const out = { name: name.trim(), spend: null, impressions: null, clicks: null, purchases: null, revenue: null, pasted: {}, isTotal: false };
      rawKeys.forEach((key) => {
        const parsed = map[key] >= 0 ? parseNumber(row[map[key]]) : null;
        out[key] = parsed ? parsed.value : null;
      });
      if (rawKeys.every((key) => out[key] === null)) return; // 숫자가 하나도 없는 줄(제목·빈 줄)은 건너뛴다
      const missing = rawKeys.filter((key) => out[key] === null && map[key] >= 0);
      if (missing.length) issues.push(`${lineNo}번째 줄 "${out.name}": 숫자로 읽지 못한 칸이 있어 계산에서 뺍니다.`);
      Object.keys(checks).forEach((key) => {
        const parsed = checks[key] >= 0 ? parseNumber(row[checks[key]]) : null;
        if (parsed) out.pasted[key] = parsed;
      });
      out.skipped = missing.length > 0 || rawKeys.some((key) => map[key] < 0);
      rows.push(out);
    });
    return { rows, issues, headerFound: true };
  }

  /** 이름에 "합계"가 있고 바로 앞 2~5개 행의 합과 5개 값이 모두 같으면 합계 행으로 본다. */
  function suggestTotals(rows) {
    const keys = ["spend", "impressions", "clicks", "purchases", "revenue"];
    return rows.map((row, index) => {
      if (!/합계|총계|전체/.test(row.name) || keys.some((key) => row[key] === null)) return false;
      for (let size = 2; size <= 5 && size <= index; size += 1) {
        const parts = rows.slice(index - size, index);
        if (keys.every((key) => parts.reduce((sum, p) => sum + (p[key] || 0), 0) === row[key])) return true;
      }
      return false;
    });
  }

  const ratio = (numerator, denominator) => (isNumber(numerator) && isNumber(denominator) && denominator > 0 ? numerator / denominator : null);

  /** 한 행의 파생 지표. 분모가 0 이면 null. */
  function derive(row) {
    const { spend, impressions, clicks, purchases, revenue } = row;
    return {
      cpm: ratio(spend, impressions) === null ? null : (spend / impressions) * 1000,
      ctr: ratio(clicks, impressions),
      cpc: ratio(spend, clicks),
      cvr: ratio(purchases, clicks),
      aov: ratio(revenue, purchases),
      cpa: ratio(spend, purchases),
      roas: ratio(revenue, spend)
    };
  }

  /** 목표 ROAS g(배수, 2.0 = 200%)에서 허용 상한. 하나라도 계산 못 하면 null. */
  function allowable(metrics, g) {
    if (!isNumber(g) || g <= 0) return null;
    const { ctr, cvr, aov } = metrics;
    if (![ctr, cvr, aov].every(isNumber)) return null;
    return { cpm: (ctr * cvr * aov * 1000) / g, cpc: (cvr * aov) / g, cpa: aov / g };
  }

  /** 판정. 구매 수만 보는 오차폭 e = z ÷ √N. 정의서 §3. */
  function judge(row, metrics, g, thresholds, verdicts) {
    if (!isNumber(row.purchases) || row.purchases < thresholds.minPurchases) return { label: verdicts.thin, key: "thin", q: null, e: null };
    if (!isNumber(metrics.roas) || !isNumber(g) || g <= 0) return { label: verdicts.none, key: "none", q: null, e: null };
    const q = metrics.roas / g;
    const e = thresholds.z / Math.sqrt(row.purchases);
    if (q >= 1 + e) return { label: verdicts.room, key: "room", q, e };
    if (q <= 1 - e) return { label: verdicts.over, key: "over", q, e };
    return { label: verdicts.edge, key: "edge", q, e };
  }

  /** 합계 제외 행들을 합산한 기준(가중 평균). 행이 minPeerRows 미만이면 null. */
  function peerBaseline(rows, totals, minRows) {
    const used = rows.filter((row, i) => !totals[i] && !row.skipped);
    if (used.length < minRows) return null;
    const sum = { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
    used.forEach((row) => Object.keys(sum).forEach((key) => { sum[key] += row[key] || 0; }));
    return { rows: used.length, metrics: derive(sum) };
  }

  /**
   * 병목: ln(ROAS ÷ 기준 ROAS) = ln(CTR비) + ln(CVR비) + ln(객단가비) − ln(CPM비). 가장 음수인 항 하나.
   * 모두 0 이상이면 factor 는 null("병목 없음"). 계산할 수 없으면 undefined.
   */
  function bottleneck(metrics, baseline) {
    if (!baseline) return undefined;
    const base = baseline.metrics;
    const parts = {
      ctr: ratio(metrics.ctr, base.ctr),
      cvr: ratio(metrics.cvr, base.cvr),
      aov: ratio(metrics.aov, base.aov),
      cpm: ratio(metrics.cpm, base.cpm)
    };
    if (!Object.values(parts).every(isNumber) || Object.values(parts).some((v) => v <= 0)) return undefined;
    const terms = { ctr: Math.log(parts.ctr), cvr: Math.log(parts.cvr), aov: Math.log(parts.aov), cpm: -Math.log(parts.cpm) };
    const worst = Object.keys(terms).reduce((a, b) => (terms[b] < terms[a] ? b : a));
    return { factor: terms[worst] < 0 ? worst : null, terms };
  }

  /** 붙여넣은 계산 열과 재계산 값 대조. 표시된 자릿수의 반올림 오차는 허용한다. */
  function mismatches(row, metrics, tolerance) {
    const found = [];
    Object.keys(row.pasted || {}).forEach((key) => {
      const pasted = row.pasted[key];
      const computed = metrics[key];
      if (!isNumber(computed)) return;
      const unit = Math.pow(10, -pasted.decimals) / (pasted.percent ? 100 : 1);
      const allowed = Math.max(Math.abs(computed) * tolerance, unit / 2 + 1e-12);
      if (Math.abs(pasted.value - computed) > allowed) found.push(key);
    });
    return found;
  }

  /** 입력 검증. 한국어 문장 배열, 없으면 빈 배열. */
  function validateInput(input) {
    const issues = [];
    if (!isNumber(input.targetRoas) || input.targetRoas <= 0) issues.push("목표 ROAS(%)를 0보다 크게 넣어 주세요.");
    if (input.margin != null && (!isNumber(input.margin) || input.margin <= 0 || input.margin > 1)) issues.push("공헌이익률은 0%보다 크고 100% 이하여야 합니다.");
    return issues;
  }

  function rowIssues(row) {
    const issues = [];
    ["spend", "impressions", "clicks", "purchases", "revenue"].forEach((key) => {
      if (isNumber(row[key]) && row[key] < 0) issues.push("음수가 있습니다.");
    });
    if (isNumber(row.clicks) && isNumber(row.impressions) && row.clicks > row.impressions) issues.push("클릭이 노출보다 많습니다.");
    if (isNumber(row.purchases) && isNumber(row.clicks) && row.purchases > row.clicks) issues.push("구매가 클릭보다 많습니다.");
    return [...new Set(issues)];
  }

  /** 전체 계산. input: { rows, totals(boolean[]), targetRoas(%), margin(0~1|null) } */
  function analyze(input, config) {
    const g = isNumber(input.targetRoas) ? input.targetRoas / 100 : null;
    const issues = validateInput(input);
    const baseline = peerBaseline(input.rows, input.totals, config.thresholds.minPeerRows);
    const results = input.rows.map((row, i) => {
      const metrics = derive(row);
      const limit = allowable(metrics, g);
      const verdict = judge(row, metrics, g, config.thresholds, config.verdicts);
      const rowProblems = rowIssues(row);
      const skipped = Boolean(row.skipped) || rowProblems.length > 0;
      const need = isNumber(g) && isNumber(metrics.roas) && metrics.roas > 0 ? g / metrics.roas : null;
      return {
        name: row.name,
        isTotal: Boolean(input.totals[i]),
        skipped,
        problems: rowProblems,
        raw: row,
        metrics,
        allowable: skipped ? null : limit,
        verdict: skipped ? { label: config.verdicts.none, key: "none", q: null, e: null } : verdict,
        needMultiple: skipped ? null : need,
        bottleneck: skipped || input.totals[i] ? undefined : bottleneck(metrics, baseline),
        mismatches: mismatches(row, metrics, config.checkTolerance)
      };
    });
    const breakEvenRoas = isNumber(input.margin) && input.margin > 0 && input.margin <= 1 ? 1 / input.margin : null;
    const belowBreakEven = breakEvenRoas !== null && isNumber(g) && g < breakEvenRoas;
    return { g, issues, results, baseline, breakEvenRoas, belowBreakEven };
  }

  return { parseNumber, parseTable, suggestTotals, derive, allowable, judge, peerBaseline, bottleneck, mismatches, validateInput, rowIssues, analyze };
});
