// 숏츠 편집기의 기준값·목록. 값과 문구를 바꿀 때는 이 파일만 고친다.
// 영상·이미지·소리 파일은 브라우저 안에서만 읽고 어디에도 저장하거나 보내지 않는다.
window.SHORTS_EDITOR_CONFIG = Object.freeze({
  // 화면 비율. 내보내기 해상도는 가로 기준 1080(또는 720)에 맞춘다.
  ratios: Object.freeze([
    Object.freeze({ id: "9:16", label: "9:16 숏츠·릴스", w: 1080, h: 1920 }),
    Object.freeze({ id: "4:5", label: "4:5 피드", w: 1080, h: 1350 }),
    Object.freeze({ id: "1:1", label: "1:1 정사각", w: 1080, h: 1080 }),
    Object.freeze({ id: "16:9", label: "16:9 가로", w: 1920, h: 1080 })
  ]),
  outputScales: Object.freeze([
    Object.freeze({ id: "1", label: "원본 크기(1080 기준)", scale: 1 }),
    Object.freeze({ id: "0.667", label: "작게(720 기준, 빠름)", scale: 2 / 3 })
  ]),

  // 자막 글꼴. 내 글꼴 파일(ttf·otf·woff)은 화면에서 추가한다.
  fonts: Object.freeze([
    Object.freeze({ id: "pretendard", label: "Pretendard", family: "Pretendard" }),
    Object.freeze({ id: "sans", label: "시스템 고딕", family: "\"Apple SD Gothic Neo\", \"Malgun Gothic\", \"Noto Sans KR\", sans-serif" }),
    Object.freeze({ id: "serif", label: "시스템 명조", family: "\"AppleMyungjo\", \"Batang\", \"Noto Serif KR\", serif" }),
    Object.freeze({ id: "mono", label: "고정폭", family: "ui-monospace, Menlo, Consolas, monospace" })
  ]),

  subtitleDefaults: Object.freeze({
    font: "pretendard", size: 64, weight: 800, color: "#ffffff", shadowColor: "#000000", shadowBlur: 14,
    box: false, boxColor: "#000000", boxOpacity: 0.55, y: 0.5, lineHeight: 1.3, letterSpacing: 0, chunk: 14
  }),
  chunkOptions: Object.freeze([
    Object.freeze({ value: 0, label: "문장 통째로" }),
    Object.freeze({ value: 20, label: "약 20자씩" }),
    Object.freeze({ value: 14, label: "약 14자씩" }),
    Object.freeze({ value: 9, label: "약 9자씩" })
  ]),

  motions: Object.freeze([
    Object.freeze({ id: "none", label: "움직임 없음" }),
    Object.freeze({ id: "zoomIn", label: "천천히 확대" }),
    Object.freeze({ id: "zoomOut", label: "천천히 축소" }),
    Object.freeze({ id: "panLeft", label: "왼쪽으로 이동" }),
    Object.freeze({ id: "panRight", label: "오른쪽으로 이동" })
  ]),

  // 합성 효과음(파일 없이 브라우저가 만든다). 길이(초)는 미리 듣기·장면 길이 계산에 쓴다.
  sfx: Object.freeze([
    Object.freeze({ id: "click", label: "클릭", seconds: 0.1 }),
    Object.freeze({ id: "pop", label: "뿅", seconds: 0.2 }),
    Object.freeze({ id: "bell", label: "딩~(맑은 종)", seconds: 1.4 }),
    Object.freeze({ id: "coin", label: "띠링(코인)", seconds: 0.5 }),
    Object.freeze({ id: "whoosh", label: "휙(전환)", seconds: 0.5 }),
    Object.freeze({ id: "keys", label: "키보드 타건", seconds: 0.6 }),
    Object.freeze({ id: "tap", label: "탭핑", seconds: 0.15 }),
    Object.freeze({ id: "drop", label: "물방울", seconds: 0.3 }),
    Object.freeze({ id: "fire", label: "모닥불", seconds: 1.8 })
  ]),

  timing: Object.freeze({
    charsPerSecond: 5.2, // 한국어 TTS 대략 속도(보통 속도 1.0). 정확한 길이는 목소리 파일을 넣어야 안다.
    speechPadSeconds: 0.35,
    minSceneSeconds: 0.5,
    stillSeconds: 3, // 글도 목소리도 없는 정지 화면
    fps: 30
  }),
  limits: Object.freeze({
    warnVideoBytes: 1.5 * 1024 * 1024 * 1024 // 이 크기를 넘는 영상은 메모리 부족 경고
  })
});
