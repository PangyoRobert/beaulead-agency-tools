const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../lead-cpa-guide/pricing-config.js");
const config = global.LEAD_CPA_GUIDE_CONFIG;

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

check(config.inflationRate, 0.1, "인상률 10%");
check(config.categories.length, 2, "대분류 2개(병원/기타)");
check(config.categories.map((c) => c.label), ["병원", "기타"], "대분류 이름과 순서");

// 원자료 3쪽·39건을 그대로 옮겼는지 개수로 고정한다. 하나라도 빠지면 여기서 걸린다.
const flatten = () =>
  config.categories.flatMap((category) =>
    category.groups.flatMap((group) => group.items.map((item) => ({ category: category.label, group: group.label, ...item })))
  );
const items = flatten();
check(items.length, 39, "원자료 총 39개 항목(병원 25 + 기타 14)");

const groupCounts = {};
items.forEach((item) => { groupCounts[item.group] = (groupCounts[item.group] || 0) + 1; });
check(groupCounts, {
  치과: 4, 성형: 8, 모발: 2, 산부인과: 2, 비뇨: 2, 안과: 4, 한의: 3,
  생활: 7, 보험: 1, 법무법인: 3, 제품: 3
}, "업종별 제품 개수가 원자료와 일치");

// 원자료 값 몇 개를 실제로 대조한다(표 위·아래·중간에서 하나씩).
const find = (name) => items.find((item) => item.name === name);
check(find("임플란트").base, 60000, "임플란트 원자료 단가");
check(find("노안교정").base, 80000, "노안교정 원자료 단가(원자료 최댓값)");
check(find("다이어트주사").base, 25000, "다이어트주사 원자료 단가(원자료 최솟값 중 하나)");
check(find("대출").base, 25000, "대출 원자료 단가");
check(find("건강기능식품").base, 50000, "건강기능식품 원자료 단가");

// 10% 반영가. 원자료가 전부 5,000원 단위라 반올림 없이 정확히 떨어져야 한다.
function adjusted(base) { return Math.round(base * (1 + config.inflationRate)); }
check(adjusted(find("임플란트").base), 66000, "임플란트 반영가");
check(adjusted(find("노안교정").base), 88000, "노안교정 반영가");
check(adjusted(find("다이어트주사").base), 27500, "다이어트주사 반영가");
items.forEach((item) => {
  check(item.base % 5000, 0, `${item.name} 원자료 단가는 5,000원 단위여야 한다`);
  check(adjusted(item.base) % 100, 0, `${item.name} 반영가는 반올림 없이 100원 단위로 떨어져야 한다`);
});

// 공개 저장소다. 원자료 출처 회사명이 이 파일이나 화면에 새어 나가면 안 된다.
const source = [
  fs.readFileSync(path.join(__dirname, "../lead-cpa-guide/pricing-config.js"), "utf8"),
  fs.readFileSync(path.join(__dirname, "../lead-cpa-guide/index.html"), "utf8"),
  fs.readFileSync(path.join(__dirname, "../lead-cpa-guide/README.md"), "utf8")
].join("\n");
["TEAM PERFORMANCE", "Teamperformnace", "teamperformance"].forEach((word) => {
  check(source.toLowerCase().includes(word.toLowerCase()), false, `원자료 출처 회사명("${word}")이 새어 나가면 안 된다`);
});

// 10% 가 실측치가 아니라는 점과 부가세 미확인 상태를 화면이 실제로 밝히는지 본다.
const page = fs.readFileSync(path.join(__dirname, "../lead-cpa-guide/index.html"), "utf8");
check(/일괄 적용한 조정값/.test(page), true, "인상률이 실측이 아님을 화면에 명시");
check(/부가세[\s\S]{0,80}확인 전/.test(page), true, "부가세 확인 전임을 화면에 명시");

console.log(`lead-cpa-guide: ${checks} checks passed`);
