const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cfg = require("../utm-manager/utm-config.js");
const calc = require("../utm-manager/utm.js");

let checks = 0;
function check(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }
const base = { title: "(가상) 테스트", url: "https://example.com/p", source: "facebook", medium: "social", campaign: "autumn_promo_2026", term: "", content: "" };

// 기본 생성: 빈 값은 붙이지 않는다
check(calc.analyze(base, cfg).url, "https://example.com/p?utm_source=facebook&utm_medium=social&utm_campaign=autumn_promo_2026", "기본 URL");
// 기존 쿼리와 해시 보존
check(calc.analyze({ ...base, url: "https://example.com/p?a=1#sec" }, cfg).url, "https://example.com/p?a=1&utm_source=facebook&utm_medium=social&utm_campaign=autumn_promo_2026#sec", "쿼리·해시 보존");
// 기존 utm 덮어쓰기 + 경고
const dup = calc.analyze({ ...base, url: "https://example.com/p?utm_source=old&utm_term=x" }, cfg);
check(dup.url, "https://example.com/p?utm_source=facebook&utm_medium=social&utm_campaign=autumn_promo_2026", "기존 utm 덮어쓰기(비운 term도 제거)");
assert.ok(dup.warnings.some((w) => w.includes("이미 utm_")), "덮어쓰기 경고"); checks += 1;
// 필수 항목과 길이
check(calc.analyze({ ...base, title: "", source: "", medium: "" }, cfg).errors.length, 3, "제목·source·medium 필수");
check(calc.analyze({ ...base, url: "example.com" }, cfg).url, null, "https 아닌 주소는 만들지 않음");
check(calc.analyze({ ...base, campaign: "a".repeat(51) }, cfg).url, null, "캠페인 50자 초과");
check(calc.analyze({ ...base, campaign: "a".repeat(50) }, cfg).errors, [], "캠페인 50자는 허용");
check(calc.analyze({ ...base, title: "가".repeat(101) }, cfg).errors.length, 1, "제목 100자 초과");
// 표기 경고는 URL을 막지 않는다
const warn = calc.analyze({ ...base, campaign: "Summer Sale", term: "운동화" }, cfg);
assert.ok(warn.url && warn.warnings.length === 3, `대문자·공백·한글 경고: ${warn.warnings.length}`); checks += 1;
check(calc.analyze({ ...base, url: "http://example.com" }, cfg).warnings.length, 1, "http 경고");
// 앞뒤 공백 제거
check(calc.analyze({ ...base, campaign: "  a  " }, cfg).values.campaign, "a", "trim");
// 표 복사: 탭·줄바꿈이 셀을 깨지 않는다
const tsv = calc.toTsv([{ values: { ...base, title: "a\tb\nc" }, url: "u" }]).split("\n");
check(tsv.length, 2, "TSV는 헤더+1행"); check(tsv[1].split("\t").length, 8, "열 8개 유지");
// 설정 점검: 값은 소문자·중복 없음
[...cfg.sources, ...cfg.mediums].forEach((o) => assert.match(o.value, /^[a-z0-9_]+$/, o.value));
check(new Set(cfg.sources.map((o) => o.value)).size, cfg.sources.length, "source 중복 없음");
check(new Set(cfg.mediums.map((o) => o.value)).size, cfg.mediums.length, "medium 중복 없음");
check(calc.analyze({ ...cfg.example, title: cfg.example.title }, cfg).errors, [], "예시가 통과");

// 공개 저장소 규칙: 입력을 밖으로 내보내거나 남기는 API 금지
const src = ["utm.js", "utm-config.js", "index.html"].map((f) => fs.readFileSync(path.join(__dirname, "../utm-manager", f), "utf8")).join("\n");
["localStorage", "sessionStorage", "indexedDB", "fetch(", "XMLHttpRequest", "sendBeacon", "history.pushState", "history.replaceState", "<form"].forEach((api) => {
  assert.ok(!src.includes(api), `금지 API: ${api}`); checks += 1;
});
console.log(`utm-manager: ${checks} checks passed`);
