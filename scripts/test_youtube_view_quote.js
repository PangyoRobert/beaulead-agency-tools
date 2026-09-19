const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../youtube-view-quote/pricing-config.js");
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
  fs.readFileSync(path.join(__dirname, "../youtube-view-quote/index.html"), "utf8")
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
