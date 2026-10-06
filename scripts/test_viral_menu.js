const assert = require("node:assert/strict");

global.window = global;
require("../viral-menu/pricing-config.js");
const config = global.VIRAL_MENU_CONFIG;

assert.equal(config.vatRate, 0.1);

// 분류 3개 · 캠페인 8개 구조. 시트 원본과 어긋나면 여기서 잡는다.
assert.deepEqual(config.groups.map((g) => g.campaigns.length), [4, 3, 1]);

const ids = new Set();
config.groups.forEach((group) => {
  group.campaigns.forEach((c) => {
    assert.ok(!ids.has(c.id), `${c.id}: id 중복`);
    ids.add(c.id);
    assert.ok(c.name && c.nameEn && c.summary.length > 0, `${c.id}: 이름·소개 누락`);
    assert.ok(Array.isArray(c.prices), `${c.id}: prices 는 배열이어야 한다`);
    c.prices.forEach((p) => {
      assert.ok(p.label, `${c.id}: 단가 항목에 label 이 필요하다`);
      assert.ok(Number.isInteger(p.supplyPrice) && p.supplyPrice > 0, `${c.id}/${p.label}: 공급가는 양의 정수`);
    });
  });
});
assert.equal(ids.size, 8);

// 공개 저장소에 원가·마진 필드가 새어 들어오지 않게 한다.
assert.doesNotMatch(JSON.stringify(config), /원가|마진|cost|margin/i);
console.log("viral-menu config OK");
