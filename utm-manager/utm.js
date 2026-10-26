/* UTM 매니저 계산 로직. Node와 브라우저에서 같이 쓴다. 저장·전송 API는 쓰지 않는다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.UTM_CALC = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const KEYS = ["source", "medium", "campaign", "term", "content"];

  function clean(s) { return String(s == null ? "" : s).trim(); }

  // 입력 점검. errors가 있으면 URL을 만들지 않고, warnings는 만들되 알려 준다.
  function validate(input, cfg) {
    const errors = [], warnings = [];
    const v = {}; KEYS.concat(["title", "url"]).forEach((k) => { v[k] = clean(input[k]); });
    if (!v.title) errors.push("태그 제목을 넣어 주세요.");
    else if (v.title.length > cfg.limits.title) errors.push(`태그 제목은 ${cfg.limits.title}자까지예요.`);
    if (!v.url) errors.push("랜딩 URL을 넣어 주세요.");
    else {
      let u = null;
      try { u = new URL(v.url); } catch (e) { /* 아래에서 처리 */ }
      if (!u || !/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) errors.push("랜딩 URL은 https://로 시작하는 전체 주소여야 해요.");
      else {
        if (u.protocol === "http:") warnings.push("http 주소예요. https로 리다이렉트되면 UTM이 사라질 수 있어요.");
        const had = KEYS.filter((k) => u.searchParams.has("utm_" + k));
        if (had.length) warnings.push(`랜딩 URL에 이미 utm_${had.join("·utm_")}이(가) 있어요. 아래 값으로 덮어써요.`);
      }
    }
    if (!v.source) errors.push("utm_source(채널)를 골라 주세요.");
    if (!v.medium) errors.push("utm_medium(유형)을 골라 주세요.");
    ["campaign", "term", "content"].forEach((k) => {
      if (v[k].length > cfg.limits[k]) errors.push(`utm_${k}은 ${cfg.limits[k]}자까지예요.`);
    });
    KEYS.forEach((k) => {
      if (!v[k]) return;
      if (/[A-Z]/.test(v[k])) warnings.push(`utm_${k}에 대문자가 있어요. GA4는 대소문자를 다른 값으로 집계하니 소문자로 통일하는 걸 권해요.`);
      if (/\s/.test(v[k])) warnings.push(`utm_${k}에 공백이 있어요. 밑줄(_)로 바꾸는 걸 권해요.`);
      if (/[^\x00-\x7F]/.test(v[k])) warnings.push(`utm_${k}에 한글 등 비영문이 있어요. 주소에서는 %로 인코딩돼 읽기 어려워요.`);
    });
    return { errors, warnings, values: v };
  }

  // 기존 쿼리·해시를 보존하고 utm_*만 덮어쓴다.
  function build(values) {
    const u = new URL(values.url);
    KEYS.forEach((k) => {
      u.searchParams.delete("utm_" + k);
      if (values[k]) u.searchParams.set("utm_" + k, values[k]);
    });
    return u.toString();
  }

  function analyze(input, cfg) {
    const r = validate(input, cfg);
    return { errors: r.errors, warnings: r.warnings, values: r.values, url: r.errors.length ? null : build(r.values) };
  }

  function tsvRow(cells) { return cells.map((c) => String(c).replace(/[\t\r\n]+/g, " ")).join("\t"); }
  const TSV_HEAD = ["태그 제목", "랜딩 URL", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "생성된 URL"];
  function toTsv(items) {
    return [tsvRow(TSV_HEAD)].concat(items.map((i) => tsvRow([i.values.title, i.values.url, i.values.source, i.values.medium, i.values.campaign, i.values.term, i.values.content, i.url]))).join("\n");
  }

  return { KEYS, validate, build, analyze, toTsv, TSV_HEAD };
});
