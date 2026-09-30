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
  "협찬은 숨기지 않습니다",
  "후보 발굴은 디엠 하나가 아닙니다",
  "캠페인 공고형 플랫폼",
  "지역 매체 렙",
  "기존 협업 이력 재활용"
].forEach((text) => check(page.includes(text), `필수 안내 문구: ${text}`));

// 후보 발굴 경로를 추가해도 "디엠이 필요 없다"고 과장하면 안 된다 — 최종 조율은
// 여전히 개별 대화라는 걸 같은 섹션에서 명시해야 한다.
check(/개별 디엠은 최종 확정 단계에서 여전히 필요/.test(page), "디엠이 사라진다고 과장하지 않음");

// SOURCE 섹션이 SCREEN 섹션을 가리키는 각주는 실제 번호(06)와 일치해야 한다 —
// 섹션을 끼워 넣으며 뒤 번호를 옮기다 참조 문구를 놓치기 쉽다.
check(/06\/SCREEN의 검증 기준/.test(page), "SOURCE의 SCREEN 각주가 06으로 갱신됨");

// 섹션 번호가 SOURCE 추가 이후에도 01부터 연속으로 이어지는지 확인한다.
const sectionNumbers = [...page.matchAll(/section-no">(\d+) \//g)].map((m) => Number(m[1]));
check(
  sectionNumbers.every((n, i) => n === i + 1),
  `섹션 번호가 01부터 연속이어야 한다: ${sectionNumbers.join(",")}`
);

check(/공정위 추천·보증 심사지침/.test(page), "공정위 공식 기준 링크");
check(/Instagram 브랜드 콘텐츠 기준/.test(page), "Instagram 공식 기준 링크");
check(!/localStorage|sessionStorage|fetch\s*\(/.test(page), "체크 상태나 고객 입력을 저장·전송하지 않음");
check(!/샤브20|에스이컴퍼니/.test(page), "특정 고객사 정보가 공개 페이지에 없음");
check(!/20\s*만\s*원|200,?000/.test(page), "검증되지 않은 숏폼 단가를 일반화하지 않음");

const ids = [...page.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
check(ids.length === new Set(ids).size, "HTML id 중복 없음");

console.log(`fnb-seeding-guide: ${checks} checks passed`);
