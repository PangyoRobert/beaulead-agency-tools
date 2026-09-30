const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../meta-ad-price-history/data-config.js");
const config = global.META_AD_PRICE_HISTORY_CONFIG;

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

check(config.quarters.length, 3, "3개 분기(2023~2025 Q4)");
check(config.quarters.map((q) => q.id), ["2023-q4", "2024-q4", "2025-q4"], "분기 순서");

// 메타가 실제 공시한 숫자. 하나라도 바뀌면 원문과 어긋난다.
const want = [
  { id: "2023-q4", yoyPriceChange: 2, fullYearPriceChange: -9, impressionsYoy: 21 },
  { id: "2024-q4", yoyPriceChange: 14, fullYearPriceChange: 10, impressionsYoy: 6 },
  { id: "2025-q4", yoyPriceChange: 6, fullYearPriceChange: 9, impressionsYoy: 18 }
];
want.forEach((w, i) => {
  const q = config.quarters[i];
  check(q.yoyPriceChange, w.yoyPriceChange, `${w.id} 광고단가 YoY`);
  check(q.fullYearPriceChange, w.fullYearPriceChange, `${w.id} 광고단가 연간`);
  check(q.impressionsYoy, w.impressionsYoy, `${w.id} 노출수 YoY`);
});

// 핵심 안전장치: driverQuote(가격 원인 설명)에는 성수기/홀리데이 단어가 없어야 한다.
// 메타가 실제로 그렇게 말한 적이 없기 때문이다. 있으면 원문에 없는 인과관계를
// 지어낸 것이다.
config.quarters.forEach((q) => {
  assert.doesNotMatch(
    q.driverQuote.toLowerCase(),
    /holiday|seasonal/,
    `${q.id}: 가격 원인 설명에 성수기 단어가 있으면 안 된다 — 메타는 이렇게 말한 적 없다`
  );
  checks += 1;
});

// holidayQuote 는 2025 Q4 에만 있고, 나머지는 없다(지어내지 않는다).
check(config.quarters[0].holidayQuote, null, "2023 Q4: 홀리데이 발언 없음");
check(config.quarters[1].holidayQuote, null, "2024 Q4: 홀리데이 발언 없음");
assert.match(config.quarters[2].holidayQuote, /holiday/i, "2025 Q4: 홀리데이 발언은 있다(CEO 발언)");
checks += 1;

// 구글 수치는 어디에도 없어야 한다 — 없는 걸 채워 넣지 않았는지 전체를 검사한다.
const wholeConfig = JSON.stringify(config);
assert.doesNotMatch(wholeConfig, /"cpc"|"cpm"/i, "구글 CPC/CPM 수치가 없어야 한다(공시 자체가 없음)");
checks += 1;
check(config.googleAbsence.checks.length, 2, "구글 부재를 뒷받침하는 확인된 원문 2건");
config.googleAbsence.checks.forEach((c) => {
  assert.doesNotMatch(c.quote, /\d+%/, `구글 확인 인용문("${c.note}")에 단가 퍼센트가 있으면 안 된다`);
  checks += 1;
});

// 페이지가 "벤치마크"라는 이름을 쓰지 않고, 이 페이지가 무엇이 아닌지를 명시하는지 본다.
const page = fs.readFileSync(path.join(__dirname, "../meta-ad-price-history/index.html"), "utf8");
assert.match(page, /성수기 CPM 상승률 벤치마크.*가 아닙니다/, "성수기 벤치마크가 아니라고 명시");
assert.match(page, /홀리데이·성수기 효과라고 공식적으로 밝힌 적이 없습니다/, "메타가 성수기 원인이라 밝힌 적 없음을 명시");
assert.match(page, /구글.*비교 가능한 공식 수치를 공시하지 않습니다/, "구글 부재를 명시");
checks += 3;

// 공개 저장소다. 입력값을 밖으로 내보내는 경로가 없어야 한다(이 페이지는 입력 자체가 없지만, 관행을 그대로 지킨다).
const source = [page, fs.readFileSync(path.join(__dirname, "../meta-ad-price-history/data-config.js"), "utf8")].join("\n");
for (const forbidden of ["localStorage", "sessionStorage", "fetch(", "XMLHttpRequest", "<form", "sendBeacon"]) {
  check(source.includes(forbidden), false, `외부 전송 경로 없음: ${forbidden}`);
}

console.log(`meta-ad-price-history: ${checks} checks passed`);
