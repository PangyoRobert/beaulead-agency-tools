/* 이미지 프롬프트 변주 생성기 설정 — 선택지·생성기 규칙·지시문 문구는 여기서만 고친다.
 * 고객사명·성과·내부 문구는 넣지 않는다(공개 저장소). 기존 프롬프트는 화면에 붙여넣어 쓰고 저장하지 않는다. */
window.IMAGE_PROMPT_CONFIG = {
  // 바꿀 점 선택지. id=화면 표시와 지시문 한글 표기, en=Claude에 주는 영문 참고 표현.
  // 체형은 몸무게(kg)가 아니라 눈에 보이는 표현으로만 둔다(이미지 AI는 숫자를 해석하지 못한다).
  groups: [
    { id: "scene", label: "계절·배경", options: [
      { id: "겨울 골프 라운딩", en: "winter golf course round" },
      { id: "봄 골프 라운딩", en: "spring golf course round" },
      { id: "여름 골프 라운딩", en: "summer golf course round" },
      { id: "가을 골프 라운딩", en: "autumn golf course round" },
      { id: "도심 야외", en: "urban outdoor setting" },
      { id: "실내 스튜디오", en: "indoor studio" }
    ] },
    { id: "gender", label: "성별", options: [
      { id: "여성", en: "woman" },
      { id: "남성", en: "man" }
    ] },
    { id: "age", label: "연령대", options: [
      { id: "20대", en: "in her/his 20s" },
      { id: "30대", en: "in her/his 30s" },
      { id: "40대", en: "in her/his 40s" },
      { id: "50대", en: "in her/his 50s" }
    ] },
    { id: "hair", label: "머리", options: [
      { id: "긴 생머리", en: "long straight hair" },
      { id: "단발", en: "bob cut" },
      { id: "묶음 머리", en: "hair tied back" },
      { id: "짧은 머리", en: "short hair" }
    ] },
    { id: "build", label: "체형", options: [
      { id: "슬림한 체형", en: "slim build" },
      { id: "보통 체형", en: "average build" },
      { id: "탄탄한 운동 체형", en: "fit athletic build" }
    ] },
    { id: "mood", label: "분위기", options: [
      { id: "산뜻한", en: "fresh, clean, bright" },
      { id: "고급스러운", en: "refined, premium" },
      { id: "활동적인", en: "energetic, active" },
      { id: "따뜻한", en: "warm, cozy" }
    ] }
  ],

  // 대상 생성기. rule=Claude에게 주는 작성 규칙, aspectRule={aspect} 치환, usage=결과 화면 안내.
  generators: [
    { id: "Gemini", hint: "문장형",
      rule: "자연스러운 문장형 영어 한두 단락으로 쓰세요. 키워드 나열은 피하세요. 피할 것은 본문 끝에 'Avoid: …' 한 문장으로 쓰고 [NEGATIVE PROMPT]에도 같은 키워드를 적으세요.",
      aspectRule: "프레임은 '{aspect}' 비율 구도로 쓰고, 문장 끝에 'aspect ratio {aspect}'를 붙이세요.",
      usage: "영어 프롬프트를 그대로 붙여넣고, 네거티브는 본문 끝의 'Avoid:' 문장으로 이미 들어 있습니다." },
    { id: "Midjourney", hint: "구문형·파라미터",
      rule: "쉼표로 이어지는 짧은 묘사 구문으로 쓰세요. [NEGATIVE PROMPT]에는 --no 뒤에 붙일 키워드만 쉼표로 쓰세요.",
      aspectRule: "프롬프트 맨 끝에 '--ar {aspect}'를 붙이세요.",
      usage: "프롬프트 끝에 ' --no ' 와 네거티브 키워드를 이어 붙이세요." },
    { id: "DALL·E 3", hint: "문장형·네거티브 없음",
      rule: "자연스러운 문장형 영어로 쓰세요. 네거티브 프롬프트를 지원하지 않으므로 피할 것은 본문 끝에 'No text, no logo' 같은 문장으로 넣고 [NEGATIVE PROMPT]에는 '없음'이라고 쓰세요.",
      aspectRule: "프레임은 '{aspect}' 비율 구도로 쓰세요.",
      usage: "영어 프롬프트만 붙여넣으세요. 출력 크기는 생성 화면에서 고릅니다." },
    { id: "Stable Diffusion", hint: "키워드형·네거티브 칸",
      rule: "쉼표로 구분한 키워드 위주로 쓰고 가장 중요한 요소를 앞에 두세요. [NEGATIVE PROMPT]는 별도 네거티브 칸에 넣을 쉼표 키워드로 쓰세요.",
      aspectRule: "비율은 프롬프트에 쓰지 마세요(생성 설정의 가로·세로로 맞춥니다). 구도만 '{aspect}' 프레임에 맞게 쓰세요.",
      usage: "영어 프롬프트는 프롬프트 칸에, 네거티브는 Negative prompt 칸에 붙여넣으세요. 가로·세로는 설정에서 맞춥니다." }
  ],

  // 비율 선택지(선택 사항). 표준 화면 비율만 둔다.
  aspects: ["1:1", "4:5", "3:4", "9:16", "16:9"],

  defaults: { generator: "Gemini" },

  noBaseText: "(없음 — 바꿀 점만으로 새로 작성)",

  // 줄 바꿈 템플릿. {base} {changes} {generator} {genRule} {aspectLine} 가 치환된다.
  instruction: [
    "당신은 이미지 생성 AI용 프롬프트 전문 에디터입니다.",
    "아래 [기존 프롬프트]를 바탕으로 [바꿀 점]만 반영한 새 이미지 프롬프트를 영어로 작성하세요.",
    "",
    "[기존 프롬프트]",
    "{base}",
    "",
    "[바꿀 점]",
    "{changes}",
    "",
    "[대상 생성기] {generator}",
    "{aspectLine}",
    "",
    "작성 규칙:",
    "- 기존 프롬프트가 있으면 제품·구도·조명·카메라 문장은 그대로 유지하고, 바꿀 점과 충돌하는 부분만 고치세요.",
    "- 영어는 이미지 생성 AI가 바로 쓰는 자연스러운 프롬프트로 쓰세요(한국어 직역 금지). 피사체 → 동작·자세 → 배경·계절 → 조명·색감 → 카메라·구도 순서로 쓰세요.",
    "- 몸무게(kg)·키·정확한 나이 같은 숫자는 이미지 AI가 해석하지 못하므로 숫자를 쓰지 말고 눈에 보이는 묘사(예: slim build, woman in her 40s)로 바꾸세요.",
    "- 지시에 없는 인물 특징(피부색·표정 등)이나 브랜드명·로고·문구를 새로 지어내지 마세요. 확실하지 않은 것은 넣지 말고 [바뀐 부분]에 '확인 필요'로 적으세요.",
    "- 이미지 안에 글자를 넣으라는 요청이 없으면 글자·로고가 생기지 않도록 피할 것에 넣으세요.",
    "- {genRule}",
    "",
    "아래 형식 그대로만 출력하세요(코드펜스·다른 설명 금지):",
    "[ENGLISH PROMPT]",
    "(영문 프롬프트 한 덩어리)",
    "[NEGATIVE PROMPT]",
    "(영문 네거티브 키워드. 이 생성기가 쓰지 않으면 '없음')",
    "[바뀐 부분]",
    "(기존 대비 바뀐 점을 한국어 3줄 이내로)"
  ].join("\n")
};
