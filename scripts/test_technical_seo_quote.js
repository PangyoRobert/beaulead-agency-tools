const assert = require("node:assert/strict");

global.window = global;
require("../technical-seo-quote/pricing-config.js");
const config = global.TECHNICAL_SEO_QUOTE_CONFIG;

assert.deepEqual(config.tiers.map((t) => t.id), ["small", "medium", "large"]);

// 시트 원본 「핵심 요약·소형·중형·대형」 탭의 합계와 항목 수. 옮겨 적다 어긋나면 여기서 잡는다.
const expected = {
  small: { items: 8, hours: 120, cost: 3000000 },
  medium: { items: 12, hours: 395, cost: 9875000 },
  large: { items: 16, hours: 860, cost: 30100000 }
};

config.tiers.forEach((tier) => {
  const want = expected[tier.id];
  assert.equal(tier.items.length, want.items, `${tier.id}: 항목 수`);
  assert.equal(tier.items.reduce((s, i) => s + i.hours, 0), want.hours, `${tier.id}: 시간 합계`);
  assert.equal(tier.items.reduce((s, i) => s + i.cost, 0), want.cost, `${tier.id}: 비용 합계`);
  assert.equal(tier.totalHours, want.hours, `${tier.id}: totalHours`);
  assert.equal(tier.totalCost, want.cost, `${tier.id}: totalCost`);

  // 한 등급 안에서는 시간당 비용이 같다(시트 구조). 단가 값은 저장소에 두지 않고 비율만 일관성 검사한다.
  const rate = tier.items[0].cost / tier.items[0].hours;
  tier.items.forEach((i) => {
    assert.ok(i.name && i.summary, `${tier.id}/${i.name}: 이름·요약 누락`);
    assert.ok(Number.isInteger(i.hours) && i.hours > 0, `${tier.id}/${i.name}: 시간은 양의 정수`);
    assert.equal(i.cost, i.hours * rate, `${tier.id}/${i.name}: 비용이 시간과 맞지 않는다`);
    assert.ok(i.tasks.length >= 3 && i.tasks.length <= 4, `${tier.id}/${i.name}: 세부 태스크 3~4개`);
  });
});

// 「가격 범위」: 시트에 적힌 값만. 대형 1명·2명은 시트가 비어 있어 null 이다.
assert.deepEqual(config.tiers[0].teamPrices, { 1: 3000000, 2: 3900000, 3: null });
assert.deepEqual(config.tiers[1].teamPrices, { 1: 9875000, 2: 12837500, 3: 14812500 });
assert.deepEqual(config.tiers[2].teamPrices, { 1: null, 2: null, 3: 42140000 });

// 공개 저장소에 시간당 단가·원가·마진이 새어 들어오지 않게 한다(2026-10-06 결정).
assert.doesNotMatch(JSON.stringify(config), /원가|마진|단가|cost\/hr|\bmargin\b|\brate\b|(^|\D)(25,?000|35,?000)(\D|$)/i);
console.log("technical-seo-quote config OK");
