/* 광고 프레임 프롬프트 생성기 설정 — 스타일·컷 옵션·지시문 문구는 여기서만 고친다. */
window.AD_FRAME_CONFIG = {
  styles: [
    { id: "시네마틱", hint: "영화적 라이팅·아나모픽", en: "cinematic" },
    { id: "팝아트 컬러풀", hint: "비비드·그래픽·팝", en: "pop-art colorful" },
    { id: "미니멀 화이트", hint: "화이트 스튜디오·여백", en: "minimal white" },
    { id: "ASMR 클로즈업", hint: "매크로·질감·슬로우", en: "ASMR macro close-up" },
    { id: "라이프스타일", hint: "일상 공간·내추럴", en: "lifestyle" },
    { id: "제품 스튜디오", hint: "정석 제품 촬영", en: "studio product" },
    { id: "SNS 숏폼 광고", hint: "세로형·빠른 훅", en: "short-form social ad" },
    { id: "프리미엄 광고", hint: "럭셔리·하이엔드", en: "premium luxury ad" }
  ],
  cutOptions: [
    { n: 3, hint: "15초 숏폼" },
    { n: 4, hint: "20~25초" },
    { n: 5, hint: "30초 광고" },
    { n: 6, hint: "풀 캠페인" }
  ],
  defaults: { style: "시네마틱", cutN: 4 },
  // 컷 흐름: 훅 → 욕구 → 제품 → 소구점 증명 → 마무리
  flow: "훅 → 문제/욕구 → 제품 → 소구점 증명 → 마무리",
  // {product} {usp} {style} {styleEn} {cutN} {flow} 는 입력값으로 치환된다.
  instruction: [
    "당신은 광고 영상 프롬프트 전문 생성 AI이자 광고 감독입니다.",
    "아래 제품의 광고 영상 캠페인 컨셉을 먼저 설계한 뒤, {cutN}개 컷 각각의 Start Frame / End Frame / Storyboard 프롬프트를 작성하세요.",
    "",
    "[제품명] {product}",
    "[소구점] {usp}",
    "[비주얼 스타일] {style} ({styleEn})",
    "[총 컷 수] {cutN}컷",
    "",
    "설계 규칙:",
    "- 컷 전체가 소구점을 향해 자연스럽게 빌드업되도록 설계하세요 ({flow}).",
    "- 스타일 \"{style}\"에 맞는 제품 연출·배경·분위기·조명·색감을 컨셉에 반영하고, 모든 컷에서 일관되게 유지하세요.",
    "- 각 컷은 Start Frame(시작 프레임)과 End Frame(끝 프레임)으로 구성된 하나의 영상 장면입니다.",
    "- Start Frame → End Frame이 자연스럽게 이어지도록, 같은 공간·같은 조명 안에서 피사체나 카메라가 변화하는 구조로 설계하세요.",
    "- 프레임 프롬프트는 이미지 생성 AI에 바로 쓸 수 있도록 제품 연출, 배경, 분위기, 조명, 색감, 구도를 구체적으로 묘사하세요.",
    "- Storyboard Prompt는 Start→End를 하나로 연결한 영상 생성용 통합 프롬프트로, 카메라 무빙(예: slow dolly-in, orbit, tilt-up)과 프레임 간 전환 동작을 반드시 포함하세요.",
    "- 영문 프롬프트는 실제 이미지·영상 생성 AI에 최적화된 자연스러운 영어 프롬프트로 작성하세요(직역 금지).",
    "",
    "순수 JSON만 출력하세요(마크다운·설명·코드펜스 금지):",
    "{",
    "  \"campaign_title\": \"캠페인 가제\",",
    "  \"concept\": \"전체 광고 컨셉 2~3문장 (톤·비주얼 방향 포함)\",",
    "  \"cuts\": [",
    "    {",
    "      \"cut\": 1,",
    "      \"role\": \"컷 역할 (예: 훅)\",",
    "      \"start_ko\": \"Start Frame 한글 프롬프트\",",
    "      \"start_en\": \"Start Frame English prompt\",",
    "      \"end_ko\": \"End Frame 한글 프롬프트\",",
    "      \"end_en\": \"End Frame English prompt\",",
    "      \"storyboard_ko\": \"Start→End 연결 스토리보드 한글 프롬프트 (카메라 무빙 포함)\",",
    "      \"storyboard_en\": \"Storyboard English prompt with camera movement\"",
    "    }",
    "  ]",
    "}",
    "cuts 배열에는 1번부터 {cutN}번까지 {cutN}개 컷을 모두 넣으세요."
  ].join("\n")
};
