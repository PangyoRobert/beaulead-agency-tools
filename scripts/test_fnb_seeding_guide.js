const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "../fnb-seeding-guide/index.html"), "utf8");
let checks = 0;

function check(condition, message) {
  assert.equal(Boolean(condition), true, message);
  checks += 1;
}

[
  "체험단",
  "로컬 인플루언서",
  "지역 파워페이지",
  "UGC 제작자",
  "콘텐츠 이용권",
  "실제 지역 도달",
  "POS",
  "협찬은 숨기지 않습니다"
].forEach((text) => check(page.includes(text), `필수 안내 문구: ${text}`));

check(/공정위 추천·보증 심사지침/.test(page), "공정위 공식 기준 링크");
check(/Instagram 브랜드 콘텐츠 기준/.test(page), "Instagram 공식 기준 링크");
check(!/localStorage|sessionStorage|fetch\s*\(/.test(page), "체크 상태나 고객 입력을 저장·전송하지 않음");
check(!/샤브20|에스이컴퍼니/.test(page), "특정 고객사 정보가 공개 페이지에 없음");
check(!/20\s*만\s*원|200,?000/.test(page), "검증되지 않은 숏폼 단가를 일반화하지 않음");

const ids = [...page.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
check(ids.length === new Set(ids).size, "HTML id 중복 없음");

console.log(`fnb-seeding-guide: ${checks} checks passed`);
