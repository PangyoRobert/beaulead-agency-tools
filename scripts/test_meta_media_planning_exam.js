const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const data = require("../meta-media-planning-exam/questions-data.js");

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// 1. 기본 데이터 구조 검증
assert.ok(data.DOMAINS, "DOMAINS 객체가 존재해야 한다");
assert.ok(data.QUESTIONS, "QUESTIONS 배열이 존재해야 한다");
check(Array.isArray(data.QUESTIONS), true, "QUESTIONS는 배열이어야 한다");
check(data.QUESTIONS.length, 50, "총 50문항이어야 한다");

// 2. 도메인별 문항 수 검증
const domainCounts = {};
data.QUESTIONS.forEach(q => {
  domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1;
});

check(domainCounts, {
  1: 8,
  2: 8,
  3: 8,
  4: 9,
  5: 8,
  6: 9
}, "6대 도메인별 문항 수가 규정과 일치해야 한다 (총 50문항)");

// 3. 개별 문항 무결성 전수 검증
const seenIds = new Set();
data.QUESTIONS.forEach((q, idx) => {
  const expectedId = idx + 1;
  check(q.id, expectedId, `문항 ID가 1부터 50까지 순서대로여야 한다 (현재: ${q.id})`);
  assert.ok(!seenIds.has(q.id), `중복된 문항 ID가 없어야 한다: ${q.id}`);
  seenIds.add(q.id);

  assert.ok(typeof q.question === "string" && q.question.trim().length > 10, `문항 ${q.id}의 질문이 유효해야 한다`);
  assert.ok(Array.isArray(q.options), `문항 ${q.id}의 보기는 배열이어야 한다`);
  check(q.options.length, 4, `문항 ${q.id}의 보기는 4개여야 한다`);
  q.options.forEach((opt, oIdx) => {
    assert.ok(typeof opt === "string" && opt.trim().length > 0, `문항 ${q.id}의 보기 ${oIdx + 1}이 비어있지 않아야 한다`);
  });

  assert.ok(Number.isInteger(q.correctAnswer), `문항 ${q.id}의 정답 인덱스는 정수여야 한다`);
  assert.ok(q.correctAnswer >= 0 && q.correctAnswer <= 3, `문항 ${q.id}의 정답은 0~3 사이여야 한다`);

  assert.ok(typeof q.explanation === "string" && q.explanation.trim().length > 15, `문항 ${q.id}의 해설이 상세해야 한다`);
  assert.ok(typeof q.keyConcept === "string" && q.keyConcept.trim().length > 2, `문항 ${q.id}의 출제 핵심이 유효해야 한다`);
  assert.ok(typeof q.domainTitle === "string" && q.domainTitle.length > 0, `문항 ${q.id}의 도메인 제목이 있어야 한다`);
});

// 4. HTML 파일 구조 검증
const htmlPath = path.join(__dirname, "../meta-media-planning-exam/index.html");
assert.ok(fs.existsSync(htmlPath), "index.html 파일이 존재해야 한다");
const html = fs.readFileSync(htmlPath, "utf8");

assert.ok(html.includes("questions-data.js"), "index.html이 questions-data.js를 로드해야 한다");
assert.ok(html.includes("../shared/tokens.css"), "index.html이 shared/tokens.css를 링크해야 한다");
assert.ok(html.toLowerCase().includes("pretendard"), "Pretendard 폰트를 로드해야 한다");
assert.ok(html.includes("BEAULEAD ↗"), "BEAULEAD 헤더 브랜딩을 포함해야 한다");
assert.ok(html.includes("본문 바로가기"), "접근성 건너뛰기 링크를 포함해야 한다");
assert.ok(html.includes("resultBanner"), "결과 배너가 포함되어 있어야 한다");

// 5. 민감정보 누출 여부 확인
const htmlBody = html.split("<main")[1] || "";
assert.ok(!htmlBody.includes("undefined</span>"), "화면에 'undefined' 리터럴이 노출되지 않아야 한다");

console.log(`meta-media-planning-exam: ${checks} checks passed successfully.`);
