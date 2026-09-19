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
