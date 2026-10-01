const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "../wellness-experience-cases/index.html"), "utf8");
const text = page.replace(/<style[\s\S]*?<\/style>/g, "");
let checks = 0;

function check(condition, message) {
  assert.equal(Boolean(condition), true, message);
  checks += 1;
}

["AG1", "Grüns", "Tabs", "Hims", "그림 1", "그림 5", "국내 적용 시 먼저 확인할 것"].forEach((t) =>
  check(page.includes(t), `필수 문구: ${t}`)
);

// 출처로 확인한 수치는 그대로 남아 있어야 한다.
["$1.2B", "$1.8M", "$6M", "$35M", "$42.8M", "$54.8M", "$11M", "NYSE", "2021년 1월 21일", "2026.06.01"].forEach((t) =>
  check(page.includes(t), `확인된 수치: ${t}`)
);

// 영상 자막에만 있고 출처를 찾지 못했거나 틀렸던 값은 다시 들어오면 안 된다.
const unverified = [
  [/나스닥/, "힘즈는 NYSE 상장이다(자막은 나스닥으로 오기)"],
  [/탭스/, "브랜드명은 Tabs다. 자막의 '탭스'는 오기이며 README 외에는 쓰지 않는다"],
  [/1\.7\s*조/, "인수 금액은 보도된 달러 기준($1.2B)만 쓴다. 환산액을 지어내지 않는다"],
  [/150\s*억|45\s*%|60\s*%|72\s*%/, "출처 미확인 수치"],
  [/125\s*만|1,?000\s*만\s*달러|\$1\.25M|\$10M/, "자막의 그린스 투자 라운드는 확인되지 않았다"],
  [/유죄|파산|사기/, "사례 논지와 무관한 창업자 개인 이력은 싣지 않는다"]
];
unverified.forEach(([re, why]) => check(!re.test(text), why));

// 수치 3개 이상 비교는 차트로 그린다 — 그린스 라운드는 막대 3개여야 한다.
const funding = page.match(/<svg[^>]*aria-label="Grüns[^"]*"[\s\S]*?<\/svg>/);
check(funding && (funding[0].match(/<rect /g) || []).length === 3, "그린스 투자 라운드는 막대 3개 차트");

const sectionNumbers = [...page.matchAll(/section-no">(\d+) \//g)].map((m) => Number(m[1]));
check(sectionNumbers.every((n, i) => n === i + 1), `섹션 번호가 01부터 연속이어야 한다: ${sectionNumbers.join(",")}`);

check(!/localStorage|sessionStorage|fetch\s*\(|<script/.test(page), "저장·전송·스크립트 없음");
check(!/20\d\d\.\d\d\.\d\d.*고객|고객사명/.test(text.replace(/고객사/g, "")), "특정 고객사 정보 없음");

const ids = [...page.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
check(ids.length === new Set(ids).size, "HTML id 중복 없음");

// 외부 링크는 새 창으로 열 때 noopener 를 같이 둔다.
const blank = page.match(/<a [^>]*target="_blank"[^>]*>/g) || [];
check(blank.length > 0 && blank.every((a) => /noopener/.test(a)), "target=_blank 링크에 noopener");

console.log(`wellness-experience-cases: ${checks} checks passed`);
