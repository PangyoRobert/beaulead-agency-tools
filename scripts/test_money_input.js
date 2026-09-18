const assert = require("node:assert/strict");

global.window = global;
const money = require("../shared/money-input.js");

// 표시 형식
assert.equal(money.format("45000000"), "45,000,000");
assert.equal(money.format("150000"), "150,000");
assert.equal(money.format("999"), "999");
assert.equal(money.format("1000"), "1,000");
assert.equal(money.format(""), "");
assert.equal(money.format("0"), "0");
// 이미 쉼표가 붙은 값을 다시 넣어도 쉼표가 겹치지 않는다(재입력·붙여넣기).
assert.equal(money.format("45,000,000"), "45,000,000");
assert.equal(money.format("4,5,0,0,0"), "45,000");

// 금액이 아닌 글자는 버린다. 붙여넣기로 "45,000,000원" 이 들어와도 살아남는다.
assert.equal(money.format("45,000,000원"), "45,000,000");
assert.equal(money.format("₩ 1 234"), "1,234");
assert.equal(money.format("abc"), "");

// 소수부는 쉼표를 넣지 않는다. 객단가는 평균이라 소수가 나올 수 있다.
assert.equal(money.format("29900.5"), "29,900.5");
assert.equal(money.format("1234567.89"), "1,234,567.89");
// 입력 도중의 끝자리 점을 지우면 소수를 칠 수 없다.
assert.equal(money.format("29900."), "29,900.");
// 소수점은 하나만 남는다.
assert.equal(money.format("1.2.3"), "1.23");

// 값 읽기 — 빈 칸은 0 이다. 바꾸기 전 Number("") 과 같은 동작이어야 한다.
assert.equal(money.parse("45,000,000"), 45000000);
assert.equal(money.parse("29,900.5"), 29900.5);
assert.equal(money.parse(""), 0);
assert.equal(money.parse("."), 0);
assert.equal(money.parse("abc"), 0);
assert.equal(money.parse("0"), 0);
assert.equal(money.parse(null), 0);
assert.equal(money.parse(undefined), 0);

// 쉼표가 섞인 값을 그냥 Number 로 읽으면 깨진다 — read() 를 써야 하는 이유.
assert.ok(Number.isNaN(Number("45,000,000")));
assert.equal(money.read({ value: "45,000,000" }), 45000000);

// 커서 자리. 쉼표를 뺀 글자 수를 기준으로 되찾는다.
// "45,000,000" 에서 의미 있는 글자 2개 뒤 = "45" 다음 = 인덱스 2
assert.equal(money.caretAfter("45,000,000", 2), 2);
// 3개 뒤 = "450" 다음. 쉼표를 건너뛰므로 인덱스 4
assert.equal(money.caretAfter("45,000,000", 3), 4);
assert.equal(money.caretAfter("45,000,000", 0), 0);
assert.equal(money.caretAfter("45,000,000", 99), 10, "범위를 넘으면 맨 뒤");
assert.equal(money.caretAfter("", 3), 0);

// 맨 앞에 한 글자를 더 치는 상황: "5,000" 앞에 4 → "45,000", 커서는 "4" 뒤
assert.equal(money.format("45000"), "45,000");
assert.equal(money.caretAfter("45,000", 1), 1);

// clean 은 표시용 쉼표만 걷어낸다.
assert.equal(money.clean("45,000,000"), "45000000");
assert.equal(money.clean("1,2.3,4"), "12.34");

// upgrade 는 DOM 이 없으면 조용히 빈 배열을 돌려준다(노드에서 로드해도 안전).
assert.deepEqual(money.upgrade(null), []);

console.log("Money input rules: 38 assertions passed.");
