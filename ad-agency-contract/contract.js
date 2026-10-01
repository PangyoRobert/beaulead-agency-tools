// 계약서 문서 모델을 만든다. DOM 을 모르므로 node 테스트에서 그대로 부른다.
// 입력값은 문자열 조각(segment)으로만 내보내고, 화면은 textContent 로 그린다 —
// 고객사가 입력한 글자가 HTML 로 해석될 길이 없다.
(function attachContract(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AD_AGENCY_CONTRACT = api;
})(typeof window !== "undefined" ? window : globalThis, function createContract() {
  // 조항 문구의 {{키}} 로 쓸 수 있는 값과, 비었을 때 화면에 보일 이름.
  const FIELD_KEYS = Object.freeze({
    clientName: "갑 상호",
    brandName: "브랜드명",
    agencyName: "을 상호",
    termPhrase: "계약기간",
    bankAccount: "입금계좌",
    court: "관할법원"
  });

  const REQUIRED = Object.freeze([
    ["clientName", "갑 상호"],
    ["brandName", "브랜드명(본 사업)"],
    ["clientBizNo", "갑 사업자번호"],
    ["clientCeoName", "갑 대표자명"],
    ["contractDate", "계약 체결일"],
    ["startDate", "계약 시작일"],
    ["endDate", "계약 종료일"]
  ]);

  const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  /** "2026-08-20" → {y, m, d}. 형식이 틀리거나 없는 날짜면 null. */
  function parseDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(iso));
    if (!match) return null;
    const [y, m, d] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return { y, m, d };
  }

  function toIso(parts) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`;
  }

  function formatDateKo(iso) {
    const parts = parseDate(iso);
    return parts ? `${parts.y}년 ${parts.m}월 ${parts.d}일` : "";
  }

  /** 시작일 + n개월 - 1일. 달 끝을 넘으면 그 달 말일로 맞춘다(1/31 + 1개월 → 2/28 까지). */
  function termEnd(startIso, months) {
    const start = parseDate(startIso);
    if (!start || !(months >= 1)) return "";
    const monthIndex = start.m - 1 + months;
    const y = start.y + Math.floor(monthIndex / 12);
    const m = (monthIndex % 12) + 1;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const same = new Date(Date.UTC(y, m - 1, Math.min(start.d, lastDay)));
    // 시작일 날짜가 다음 달에 없으면(31일 등) 그 달 말일이 곧 종료일이다.
    if (start.d > lastDay) {
      return toIso({ y, m, d: lastDay });
    }
    same.setUTCDate(same.getUTCDate() - 1);
    return toIso({ y: same.getUTCFullYear(), m: same.getUTCMonth() + 1, d: same.getUTCDate() });
  }

  /** 종료일이 시작일에서 정확히 n개월이면 n, 아니면 null. 36개월까지만 본다. */
  function exactMonths(startIso, endIso) {
    if (!parseDate(startIso) || !parseDate(endIso)) return null;
    for (let n = 1; n <= 36; n += 1) {
      if (termEnd(startIso, n) === endIso) return n;
    }
    return null;
  }

  /** 제4조 1항 "계약기간은 ___ 한다" 의 빈칸. 조사까지 붙여 돌려준다. */
  function termPhrase(startIso, endIso) {
    const start = formatDateKo(startIso);
    const end = formatDateKo(endIso);
    if (!start || !end) return "";
    const months = exactMonths(startIso, endIso);
    return months ? `${start}부터 ${months}개월간으로` : `${start}부터 ${end}까지로`;
  }

  /** 숫자만 10자리면 000-00-00000 으로, 아니면 입력 그대로. */
  function formatBizNo(value) {
    const digits = text(value).replace(/\D/g, "");
    if (digits.length !== 10) return text(value);
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  function won(amount) {
    return `${Math.round(amount).toLocaleString("ko-KR")}원`;
  }

  /** 붙임 견적서1 계산. 광고비와 대행수수료 각각에 부가세를 매기고, 원 단위는 항목마다 반올림한다.
   *  금액과 율이 숫자가 아니면 0 으로 본다(검증이 따로 경고한다). */
  function schedule(rows, vatRate) {
    const rate = Number(vatRate) >= 0 ? Number(vatRate) : 0;
    const vatOf = (amount) => Math.round(amount * rate);
    const lines = (rows || []).map((row) => {
      const media = text(row.media);
      const budget = Number(row.budget) > 0 ? Number(row.budget) : 0;
      const feeRate = Number(row.feeRate) > 0 ? Number(row.feeRate) : 0;
      const fee = Math.round((budget * feeRate) / 100);
      const budgetVat = vatOf(budget);
      const feeVat = vatOf(fee);
      const supply = budget + fee;
      const vat = budgetVat + feeVat;
      return { media, budget, budgetVat, feeRate, fee, feeVat, supply, vat, total: supply + vat };
    });
    const sum = (key) => lines.reduce((acc, line) => acc + line[key], 0);
    return {
      vatRate: rate,
      lines,
      budget: sum("budget"),
      budgetVat: sum("budgetVat"),
      fee: sum("fee"),
      feeVat: sum("feeVat"),
      supply: sum("supply"),
      vat: sum("vat"),
      total: sum("total")
    };
  }

  /** 매체 행마다 고른 세부 업무 프리셋 중 켜진 항목 + 추가 항목. 고른 게 없으면 그 매체는 건너뛴다. */
  function scopeBlocks(rows, config) {
    const presets = (config.mediaScope && config.mediaScope.presets) || [];
    return (rows || []).map((row) => {
      const preset = presets.find((item) => item.id === row.scopeId);
      if (!preset) return null;
      const on = new Set(row.scopeOn || []);
      const picked = preset.items.filter((_, index) => on.has(index)).map((item) => item.text);
      const extra = text(row.scopeExtra).split(/\n+/).map((line) => line.trim()).filter(Boolean);
      return { media: text(row.media), heading: preset.heading, items: [...picked, ...extra] };
    }).filter((block) => block && block.items.length);
  }

  function percent(rate) {
    return `${Number(Number(rate).toFixed(2))}%`;
  }

  function usesSchedule(input) {
    return input.amountMode === "schedule";
  }

  function validate(input, config) {
    const issues = [];
    REQUIRED.forEach(([key, label]) => {
      if (!text(input[key])) issues.push({ level: "error", field: key, message: `${label}을(를) 입력해 주세요.` });
    });

    ["contractDate", "startDate", "endDate"].forEach((key) => {
      if (text(input[key]) && !parseDate(input[key])) {
        issues.push({ level: "error", field: key, message: "날짜 형식이 올바르지 않습니다." });
      }
    });

    const start = parseDate(input.startDate);
    const end = parseDate(input.endDate);
    if (start && end && toIso(end) < toIso(start)) {
      issues.push({ level: "error", field: "endDate", message: "계약 종료일이 시작일보다 빠릅니다." });
    }

    const bizDigits = text(input.clientBizNo).replace(/\D/g, "");
    if (text(input.clientBizNo) && bizDigits.length !== 10) {
      issues.push({ level: "warning", field: "clientBizNo", message: "사업자번호는 숫자 10자리입니다. 입력값을 확인해 주세요." });
    }

    if (usesSchedule(input)) {
      const rows = input.scheduleRows || [];
      if (rows.length === 0) {
        issues.push({ level: "error", field: "scheduleRows", message: "견적서1에 매체를 1개 이상 추가해 주세요." });
      }
      rows.forEach((row, index) => {
        const n = index + 1;
        if (!text(row.media)) issues.push({ level: "error", field: "scheduleRows", message: `견적서1 ${n}행: 매체명이 비어 있습니다.` });
        if (!(Number(row.budget) > 0)) issues.push({ level: "warning", field: "scheduleRows", message: `견적서1 ${n}행: 월 광고비가 0원입니다.` });
        const rate = Number(row.feeRate);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
          issues.push({ level: "error", field: "scheduleRows", message: `견적서1 ${n}행: 수수료율은 0~100% 사이여야 합니다.` });
        }
        const preset = config && config.mediaScope && config.mediaScope.presets.find((item) => item.id === row.scopeId);
        if (preset) {
          const on = new Set(row.scopeOn || []);
          const drafts = preset.items.filter((item, index) => on.has(index) && item.status === "draft").length;
          if (!on.size && !text(row.scopeExtra)) {
            issues.push({ level: "warning", field: "scheduleRows", message: `견적서1 ${n}행: 세부 업무 유형을 골랐지만 선택된 항목이 없어 견적서에 나오지 않습니다.` });
          }
          if (drafts) {
            issues.push({ level: "warning", field: "scheduleRows", message: `견적서1 ${n}행: 초안·미확정 항목 ${drafts}개가 켜져 있습니다. 확정된 문구인지 확인한 뒤 인쇄해 주세요.` });
          }
        }
      });
    } else if (!text(input.totalAmountText)) {
      issues.push({ level: "error", field: "totalAmountText", message: "총계약금액 문구를 입력해 주세요." });
    }

    return issues;
  }

  /** 입력값 + 설정을 {{키}} 사전으로 모은다. 빈 값은 "" 로 두고 화면이 빈칸으로 그린다. */
  function values(input, config) {
    return {
      clientName: text(input.clientName),
      brandName: text(input.brandName),
      agencyName: config.agency.name,
      termPhrase: termPhrase(input.startDate, input.endDate),
      bankAccount: config.agency.bankAccount,
      court: config.court
    };
  }

  /** "…{{key}}…" → [{text}, {field, value, label}, …]. 모르는 키는 설정 오류라 바로 던진다. */
  function fill(template, dict) {
    const parts = [];
    const pattern = /\{\{(\w+)\}\}/g;
    let last = 0;
    let match;
    while ((match = pattern.exec(template))) {
      const key = match[1];
      if (!Object.prototype.hasOwnProperty.call(FIELD_KEYS, key)) throw new Error(`Unknown contract field: ${key}`);
      if (match.index > last) parts.push({ text: template.slice(last, match.index) });
      parts.push({ field: key, value: dict[key] || "", label: FIELD_KEYS[key] });
      last = pattern.lastIndex;
    }
    if (last < template.length) parts.push({ text: template.slice(last) });
    return parts;
  }

  function slot(key, value, label) {
    return [{ field: key, value: text(value), label }];
  }

  function totalAmount(input, config) {
    if (!usesSchedule(input)) return slot("totalAmountText", input.totalAmountText, "총계약금액");
    const t = schedule(input.scheduleRows, config.vatRate);
    return [{ text: `월 ${won(t.supply)} (VAT 별도) · VAT 포함 ${won(t.total)}` }];
  }

  /** 요강 총계약금액 칸 아래에 붙는 매체별 내역. 글자만으로 계산 과정이 보이게 한다. */
  function totalDetails(input, config) {
    if (!usesSchedule(input)) return [];
    const t = schedule(input.scheduleRows, config.vatRate);
    const vatLabel = `부가세 ${percent(t.vatRate * 100)}`;
    const lines = t.lines.map((line) => [
      { field: "media", value: line.media, label: "매체명" },
      { text: ` : 광고비 ${won(line.budget)} + 대행수수료 ${won(line.fee)}(${percent(line.feeRate)}) = ${won(line.supply)}, ${vatLabel} ${won(line.vat)} → ${won(line.total)}` }
    ]);
    lines.push([{ text: `합계 : 공급가액 ${won(t.supply)} + ${vatLabel} ${won(t.vat)} = ${won(t.total)} (세부 내역은 붙임 “${config.attachment.name}”)` }]);
    return lines;
  }

  function build(input, config) {
    const dict = values(input, config);
    const party = {
      client: {
        name: slot("clientName", input.clientName, "갑 상호"),
        bizNo: slot("clientBizNo", formatBizNo(input.clientBizNo), "사업자번호"),
        ceo: [
          ...slot("clientCeoTitle", input.clientCeoTitle, "직함"),
          { text: " " },
          ...slot("clientCeoName", input.clientCeoName, "대표자명")
        ]
      },
      agency: {
        name: [{ text: config.agency.name }],
        bizNo: [{ text: config.agency.bizNo }],
        ceo: [{ text: `${config.agency.ceoTitle} ${config.agency.ceoName}` }]
      }
    };

    const contractDate = slot("contractDate", formatDateKo(input.contractDate), "계약 체결일");
    const start = formatDateKo(input.startDate);
    const end = formatDateKo(input.endDate);

    const summary = [
      { label: "계약명", value: slot("contractName", input.contractName, "계약명") },
      { label: "총계약금액", value: totalAmount(input, config), details: totalDetails(input, config) },
      {
        label: "계약기간",
        value: [...slot("startDate", start, "시작일"), { text: " ~ " }, ...slot("endDate", end, "종료일")]
      },
      { label: "대금지급조건", value: slot("paymentTerms", input.paymentTerms, "대금지급조건") },
      {
        label: "붙임문서",
        value: usesSchedule(input)
          ? [{ text: `${config.attachment.name} (${config.attachment.title})` }]
          : slot("attachments", input.attachments, "붙임문서")
      }
    ];

    const articleSources = config.articles.slice();
    const special = text(input.specialTerms);
    if (special) {
      articleSources.push({
        title: config.specialTermsTitle,
        paragraphs: special
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => ({ text: line, literal: true }))
      });
    }

    const articles = articleSources.map((article, index) => {
      const numbered = article.paragraphs.length > 1;
      return {
        no: index + 1,
        heading: `제${index + 1}조 (${article.title})`,
        paragraphs: article.paragraphs.map((paragraph, pIndex) => ({
          marker: numbered ? CIRCLED[pIndex] : "",
          // 특약은 사용자가 쓴 글이라 {{ }} 를 해석하지 않는다.
          segments: paragraph.literal ? [{ text: paragraph.text }] : fill(paragraph.text, dict),
          items: (paragraph.items || []).map((item, iIndex) => ({ marker: `${iIndex + 1}.`, segments: fill(item, dict) })),
          bullets: (paragraph.bullets || []).map((item) => ({ marker: "•", segments: fill(item, dict) }))
        }))
      };
    });

    return {
      title: config.title,
      bodyTitle: config.bodyTitle,
      contractDate,
      party,
      preamble: fill(config.preamble, dict),
      summary,
      articles,
      closing: config.closing,
      attachment: usesSchedule(input)
        ? { name: config.attachment.name, title: config.attachment.title, note: config.attachment.note, ...schedule(input.scheduleRows, config.vatRate), scopes: scopeBlocks(input.scheduleRows, config) }
        : null,
      issues: validate(input, config)
    };
  }

  /** 문서 모델 안의 빈 입력 칸 이름 목록. 인쇄 전에 한 번 더 보여준다. */
  function blanks(model) {
    const found = new Set();
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      if (node.field && !node.value) found.add(node.label);
      Object.values(node).forEach(walk);
    };
    walk(model);
    return [...found];
  }

  return Object.freeze({
    FIELD_KEYS,
    parseDate,
    formatDateKo,
    termEnd,
    exactMonths,
    termPhrase,
    formatBizNo,
    won,
    percent,
    schedule,
    scopeBlocks,
    validate,
    fill,
    build,
    blanks
  });
});
