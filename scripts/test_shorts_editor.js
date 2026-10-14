const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../shorts-editor/shorts-config.js");
const E = require("../shorts-editor/engine.js");
const config = global.SHORTS_EDITOR_CONFIG;
const timing = config.timing;

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}
function close(actual, expected, message, tolerance = 1e-9) {
  assert.ok(typeof actual === "number" && Math.abs(actual - expected) < tolerance, `${message}: ${actual} != ${expected}`);
  checks += 1;
}

// 문장 나누기
check(E.splitSentences("안녕하세요. 오늘은 3.5배 빨라졌어요! 정말요?"), ["안녕하세요.", "오늘은 3.5배 빨라졌어요!", "정말요?"], "문장부호에서 끊고 소수점은 끊지 않는다");
check(E.splitSentences("첫 줄\n\n둘째 줄  \n셋째."), ["첫 줄", "둘째 줄", "셋째."], "줄바꿈은 문장 경계");
check(E.splitSentences("정말...? 그래요!!"), ["정말...?", "그래요!!"], "연속 문장부호는 한 덩어리");
check(E.splitSentences("그는 \"가자.\" 라고 말했다."), ["그는 \"가자.\"", "라고 말했다."], "닫는 따옴표는 문장에 붙인다");
check(E.splitSentences("   \n  "), [], "빈 대본");
check(E.splitSentences(""), [], "빈 문자열");

// 자막 끊기
check(E.chunkText("가나다 라마바 사아자", 0), ["가나다 라마바 사아자"], "0 이면 통째로");
check(E.chunkText("가나다 라마바 사아자", 7), ["가나다 라마바", "사아자"], "공백 단위로 채운다");
check(E.chunkText("가나다라마바사아자차", 4), ["가나다라", "마바사아", "자차"], "긴 낱말은 강제로 자른다");
check(E.chunkText("", 9), [], "빈 글");
check(E.chunkText("짧은 글", 14), ["짧은 글"], "짧으면 그대로");
check(E.chunkText("a b c d e f", 3).join(" "), "a b c d e f", "끊어도 글자는 그대로 이어진다");

// 길이
close(E.estimateSpeechSeconds("가나다라마", 1, timing), 5 / 5.2 + 0.35, "읽기 추정");
check(E.estimateSpeechSeconds("", 1, timing), 0, "빈 글은 0");
check(E.estimateSpeechSeconds("가", 1, timing) >= timing.minSceneSeconds, true, "아주 짧아도 최소 길이 이상");
check(E.estimateSpeechSeconds("가나다라마", 2, timing) < E.estimateSpeechSeconds("가나다라마", 1, timing), true, "속도가 빠르면 짧다");
const S = (over) => ({ ...E.defaultScene("가나다라마"), ...over });
close(E.sceneDuration(S({}), { voiceDuration: 4.2 }, timing), 4.2, "목소리 파일 길이가 우선");
close(E.sceneDuration(S({ duration: 6 }), { voiceDuration: null }, timing), 6, "직접 정한 길이");
close(E.sceneDuration(S({ text: "", narrate: false }), { clipSeconds: 7 }, timing), 7, "글이 없으면 영상 구간 길이");
close(E.sceneDuration(S({ text: "", narrate: false }), {}, timing), timing.stillSeconds, "아무것도 없으면 정지 화면 길이");
close(E.sceneDuration(S({ hold: 1.5 }), { voiceDuration: 4 }, timing), 5.5, "끝에 더 보여주기를 더한다");
close(E.sceneDuration(S({ text: "", narrate: false, duration: 0.1 }), {}, timing), timing.minSceneSeconds, "최소 길이");
close(E.sceneDuration(S({ narrate: false, text: "자막만", duration: null }), { clipSeconds: 2 }, timing), 2, "읽지 않는 장면은 글 길이로 추정하지 않는다");

// 영상 자르기
check(E.clipRange({ trimIn: 2, trimOut: 5 }, 10), { start: 2, end: 5, length: 3 }, "구간");
check(E.clipRange({ trimIn: 0, trimOut: null }, 10), { start: 0, end: 10, length: 10 }, "끝까지");
check(E.clipRange({ trimIn: 9.99, trimOut: 3 }, 10).length >= 0.05 - 1e-9, true, "구간은 0.05초 이상");
check(E.clipRange({ trimIn: -3, trimOut: 99 }, 10), { start: 0, end: 10, length: 10 }, "범위 밖은 영상 안으로");

// 타임라인
const media = { m1: { kind: "video", duration: 10 }, i1: { kind: "image", duration: 0 } };
const voices = { v1: { duration: 3 } };
const lookup = { media: (id) => media[id] || null, voice: (id) => voices[id] || null };
const scenes = [
  S({ id: "a", text: "첫 장면", mediaId: "m1", trimIn: 1, trimOut: 4, narrate: false }), // 영상 구간 3초
  S({ id: "b", text: "이어지는 장면", mediaId: null, voiceId: "v1" }), // 3초, 앞 영상 이어서
  S({ id: "c", text: "그림", mediaId: "i1", narrate: false, duration: 2 }), // 2초 이미지
  S({ id: "d", text: "", mediaId: "gone", narrate: false }) // 지워진 파일 → 화면 없음, 3초
];
const tl = E.buildTimeline(scenes, lookup, timing, 1);
check(tl.items.map((i) => [i.start, i.end]), [[0, 3], [3, 6], [6, 8], [8, 11]], "장면 시작·끝");
close(tl.total, 11, "전체 길이");
check(tl.items.map((i) => i.holder), [0, 0, 2, -1], "화면 이어쓰기: 앞 장면 화면을 쓰고, 지워진 파일은 화면 없음");
check(tl.items[3].media, null, "지워진 파일은 화면 없음");
check(E.sceneAt(tl, 0).index, 0, "시작");
check(E.sceneAt(tl, 3).index, 1, "경계는 다음 장면");
check(E.sceneAt(tl, 999).index, 3, "끝을 넘으면 마지막 장면");
check(E.sceneAt({ items: [], total: 0 }, 1), null, "장면 없음");
close(E.sourceTime(tl, tl.items[0], 1.5), 2.5, "첫 장면의 영상 위치 = trimIn + 경과");
close(E.sourceTime(tl, tl.items[1], 4.5), 4, "이어 쓰는 장면은 trimOut 에서 멈춘다(마지막 프레임)");
close(E.sourceTime(tl, tl.items[2], 7), 0, "이미지는 0");

// 화면 움직임·맞춤
check(E.motionTransform("none", 0.5), { scale: 1, tx: 0, ty: 0 }, "움직임 없음");
close(E.motionTransform("zoomIn", 1).scale, 1.15, "확대 끝");
close(E.motionTransform("zoomOut", 0).scale, 1.15, "축소 시작");
close(E.motionTransform("zoomOut", 1).scale, 1, "축소 끝");
close(E.motionTransform("panLeft", 0).tx, 0.04, "왼쪽 이동 시작");
close(E.motionTransform("panLeft", 1).tx, -0.04, "왼쪽 이동 끝");
close(E.motionTransform("panRight", 0.5).tx, 0, "오른쪽 이동 중간");
close(E.motionTransform("zoomIn", 9).scale, 1.15, "진행 범위 밖은 끝으로");
check(E.fitRect(1920, 1080, 1080, 1920, "cover"), { dx: -(1920 * (1920 / 1080) - 1080) / 2, dy: 0, dw: 1920 * (1920 / 1080), dh: 1920 }, "가로 영상을 세로 화면에 가득");
const contain = E.fitRect(1920, 1080, 1080, 1920, "contain");
close(contain.dw, 1080, "전체 보이게: 폭 맞춤");
close(contain.dy, (1920 - contain.dh) / 2, "전체 보이게: 위아래 여백");
check(E.fitRect(0, 0, 100, 200, "cover"), { dx: 0, dy: 0, dw: 100, dh: 200 }, "크기를 모르면 칸 전체");

// 자막 분배
close(E.speakSeconds({ scene: { hold: 1 }, duration: 5 }), 4, "말하는 구간 = 길이 − hold");
check(E.subtitleAt("가나다 라마바 사아자", 0, 6, 7), "가나다 라마바", "처음 조각");
check(E.subtitleAt("가나다 라마바 사아자", 5, 6, 7), "사아자", "뒤 조각");
check(E.subtitleAt("가나다 라마바 사아자", 99, 6, 7), "사아자", "말이 끝난 뒤(끝에 더 보여주기)는 마지막 조각 유지");
check(E.subtitleAt("가나다", 0, 6, 14), "가나다", "한 조각");
check(E.subtitleAt("", 0, 3, 14), "", "빈 글");

// 소리 일정
const planScenes = [
  S({ id: "a", voiceId: "v1", sfxId: "pop", sfxDelay: 0.5, sfxVolume: 0.6, narrate: false, text: "", duration: null }),
  S({ id: "b", sfxId: "bell", narrate: false, text: "", duration: 2 })
];
const ptl = E.buildTimeline(planScenes, lookup, timing, 1);
const plan = E.audioPlan(ptl, 0);
check(plan.map((e) => [e.type, e.id, e.at]), [["voice", "v1", 0], ["sfx", "pop", 0.5], ["sfx", "bell", 3]], "처음부터: 목소리·효과음 시작 시각");
check(plan[1].volume, 0.6, "효과음 볼륨");
const later = E.audioPlan(ptl, 1);
check(later.map((e) => [e.type, e.id]), [["voice", "v1"], ["sfx", "bell"]], "1초부터: 이미 지난 효과음은 빠지고 진행 중인 목소리는 남는다");
close(later[0].offset, 1, "진행 중인 목소리는 1초 지점부터");
check(E.audioPlan(ptl, 99), [], "끝을 넘으면 없음");

// 파일 이름
check(E.exportName(new Date(2026, 9, 14, 7, 5)), "shorts-20261014-0705", "내보내기 파일 이름");

// 설정
check(config.ratios.map((r) => r.id), ["9:16", "4:5", "1:1", "16:9"], "화면 비율 4종");
check(config.ratios.every((r) => r.w > 0 && r.h > 0), true, "비율 크기");
check(config.sfx.map((s) => s.id), ["click", "pop", "bell", "coin", "whoosh", "keys", "tap", "drop", "fire"], "합성 효과음 9종");
check(config.motions.map((m) => m.id), ["none", "zoomIn", "zoomOut", "panLeft", "panRight"], "움직임 5종");
check(config.chunkOptions.map((c) => c.value), [0, 20, 14, 9], "자막 끊기 옵션");
check(config.subtitleDefaults.chunk, 14, "기본 자막 끊기");

// 화면 연결 점검 — app.js 가 $("id") 로 찾는 요소가 index.html 에 모두 있어야 한다(없으면 화면이 통째로 죽는다).
const dir = path.join(__dirname, "..", "shorts-editor");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const wanted = [...new Set([...appSource.matchAll(/\$\("([A-Za-z0-9_]+)"\)/g)].map((m) => m[1]))];
const missing = wanted.filter((id) => !html.includes(`id="${id}"`));
check(missing, [], "app.js 가 찾는 요소가 index.html 에 모두 있다");
check(wanted.length > 40, true, "찾는 요소 목록을 읽었다");
["shorts-config.js", "engine.js", "sfx.js", "app.js"].forEach((f) => check(html.includes(`src="./${f}"`), true, `index.html 이 ${f} 를 불러온다`));
check(html.indexOf("shorts-config.js") < html.indexOf("engine.js") && html.indexOf("sfx.js") < html.indexOf("app.js"), true, "스크립트 로드 순서");

// 공개 저장소 규칙 — 파일·입력값을 밖으로 내보내거나 브라우저에 남기는 경로가 없어야 한다.
const source = ["index.html", "app.js", "engine.js", "sfx.js", "shorts-config.js"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "URLSearchParams", "fetch(", "XMLHttpRequest", "<form", "innerHTML", "location.hash", "sendBeacon", "WebSocket"]) {
  check(source.includes(forbidden), false, `유출·저장 경로 없음: ${forbidden}`);
}
// 외부 스크립트는 불러오지 않는다(글꼴 CSS 외). 영상 처리는 전부 브라우저 기본 기능만 쓴다.
check([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).every((src) => src.startsWith("./")), true, "스크립트는 전부 같은 폴더 파일");

console.log(`shorts-editor: ${checks} checks passed`);
