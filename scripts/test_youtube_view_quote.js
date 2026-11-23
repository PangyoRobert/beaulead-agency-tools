const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../youtube-view-quote/pricing-config.js");
require("../youtube-view-quote/calculator.js");
const calculator = global.YoutubeViewCalculator;
const config = global.YOUTUBE_VIEW_CONFIG;

// 확정된 판매 조건. 세 값 중 하나라도 바뀌면 영업 자료와 어긋나므로 여기서 잡는다.
const expected = [
  { id: "light", guaranteedViews: 10000, supplyPrice: 990000, total: 1089000 },
  { id: "standard", guaranteedViews: 20000, supplyPrice: 1990000, total: 2189000 },
  { id: "premium", guaranteedViews: 30000, supplyPrice: 2890000, total: 3179000 }
];

assert.equal(config.vatRate, 0.1);
assert.equal(config.packages.length, expected.length);

expected.forEach((want, index) => {
  const plan = config.packages[index];
  assert.equal(plan.id, want.id);
  assert.equal(plan.guaranteedViews, want.guaranteedViews);
  assert.equal(plan.supplyPrice, want.supplyPrice);
  assert.equal(
    Math.round(plan.supplyPrice * (1 + config.vatRate)),
    want.total,
    `${want.id}: VAT 포함 금액이 ${want.total} 이어야 한다`
  );
});

// 보장 조회수는 최소 노출수의 2%다. 이 관계가 깨지면 예상 노출 구간이 근거를 잃는다.
config.packages.forEach((plan) => {
  assert.equal(
    plan.impressionsMin * 0.02,
    plan.guaranteedViews,
    `${plan.id}: 보장 조회수가 최소 노출수의 2% 여야 한다`
  );
  assert.ok(plan.impressionsMax > plan.impressionsMin, `${plan.id}: 노출 구간이 뒤집혔다`);
});

// 금액 → 조회수 환산. 기준점(패키지 금액)에서는 패키지 보장 조회수와 정확히 같아야 한다.
config.packages.forEach((plan) => {
  const out = calculator.calculate(config, plan.supplyPrice);
  assert.equal(out.status, "ok");
  assert.equal(out.views, plan.guaranteedViews, `${plan.id}: 패키지 금액의 환산 조회수가 패키지와 달라졌다`);
  assert.equal(out.impressionsMin, plan.impressionsMin);
  assert.equal(out.impressionsMax, plan.impressionsMax);
});
// 구간 안쪽 값(수기 계산): 100만 원 = 10,000 + 10,000*(10,000/1,000,000) = 10,100,
// 240만 원 = 20,000 + 10,000*(410,000/900,000) = 24,555(내림).
assert.equal(calculator.calculate(config, 1000000).views, 10100);
assert.equal(calculator.calculate(config, 2400000).views, 24555);
// 금액이 늘면 조회수가 줄지 않는다(구간 경계 포함).
let previous = 0;
for (let amount = 990000; amount <= 2890000; amount += 10000) {
  const views = calculator.calculate(config, amount).views;
  assert.ok(views >= previous, `${amount}원에서 조회수가 줄었다`);
  previous = views;
}
// 범위 밖은 연장하지 않는다.
assert.equal(calculator.calculate(config, 989999).status, "below");
assert.equal(calculator.calculate(config, 2890001).status, "above");
assert.equal(calculator.calculate(config, NaN).status, "invalid");
assert.deepEqual(calculator.bounds(config), { min: 990000, max: 2890000 });

// 계정 권한 제한은 성과 확인 수단과 맞바꾸는 조건이다. 제한만 남고 확인 수단이
// 사라지면 근거 없는 제약으로 읽히므로, 세 항목이 함께 있는지 본다.
const ops = config.operations;
assert.equal(ops.items.length, 3);
assert.match(ops.lead, /하나의 Google Ads 계정/);
assert.match(ops.items[0].title, /교차 확인/);
assert.match(ops.items[0].body, /YouTube 스튜디오 애널리틱스/);
assert.match(ops.items[1].body, /원본 수치/);
assert.match(ops.items[2].title, /권한 제한/);
assert.equal(ops.items[2].points.length, 2, "권한을 제한하는 이유 두 가지가 모두 있어야 한다");

// 같은 말을 안내 사항에서 한 번 더 하지 않는다. 두 곳에 두면 한쪽만 고쳐진다.
config.notices.forEach((notice) => {
  assert.doesNotMatch(notice.title, /광고 계정|성과 확인/, `"${notice.title}" 는 운영 안내와 중복이다`);
});

// GDN 안내(GA4·카페24 유입 검증)는 이 상품 범위 밖이다. 유튜브 조회수 상품 페이지에
// 다른 상품 설명이 섞이면 구매 검토자가 자기 상품 조건을 구별하지 못한다.
const wholeConfig = JSON.stringify(config);
["GDN", "GA4", "카페24"].forEach((word) => {
  assert.ok(!wholeConfig.includes(word), `"${word}" 는 이 페이지 범위 밖이다`);
});

// 공개 저장소다. 원가와 조회당 단가가 설정 파일이나 화면에 새어 나가면 안 된다.
// 영어 일반 단어(cost, margin)는 CSS 속성과 충돌해 쓸 수 없으므로, 실제로 샐 수 있는
// 업무 표현만 본다. 주석에 적힌 금지 사유 자체는 걸리지 않게 주석 줄은 제외한다.
const banned = ["원가", "마진", "조회당", "조회율", "CPV"];
const source = [
  fs.readFileSync(path.join(__dirname, "../youtube-view-quote/pricing-config.js"), "utf8"),
  fs.readFileSync(path.join(__dirname, "../youtube-view-quote/index.html"), "utf8"),
  fs.readFileSync(path.join(__dirname, "../youtube-view-quote/calculator.js"), "utf8")
].join("\n");
const inspectable = source
  .split("\n")
  .filter((line) => {
    const trimmed = line.trimStart();
    return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
  })
  .join("\n");
banned.forEach((word) => {
  const hits = inspectable.split(word).length - 1;
  assert.equal(hits, 0, `"${word}" 가 주석 밖에 ${hits}회 나온다. 공개 페이지에 둘 수 없는 표현이다.`);
});

console.log("youtube-view-quote: 모든 단언 통과");
