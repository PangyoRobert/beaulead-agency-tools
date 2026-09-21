// 영상 제작 견적기의 단가와 문구 원본.
// 값을 바꿀 때는 이 파일만 고친다. index.html 에는 금액을 적지 않는다.
// 공개 페이지이므로 원가, 외주 단가, 마진은 이 파일에 넣지 않는다.
window.VIDEO_QUOTE_CONFIG = Object.freeze({
  vatRate: 0.1,
  volumeDiscount: Object.freeze({
    minQuantity: 10,
    rate: 0.05,
    label: "10편 이상 볼륨 할인 5%",
    appliedNote: "10편 이상 볼륨 할인 5% 자동 적용",
    pendingNote: "10편 이상부터 기본제작비 5% 할인"
  }),
  maxQuantity: 20,

  // 1분 영상은 서비스 레벨에 따라 단가가 갈린다. price 가 있는 길이는 레벨과 무관하다.
  durations: Object.freeze([
    Object.freeze({
      id: "s15",
      label: "15초",
      price: 150000,
      defaultQuantity: 0,
      meta: "30초 이내 균일 · 숏폼 부스터",
      breakdownLabel: "15초 · 숏폼 부스터"
    }),
    Object.freeze({
      id: "s30",
      label: "30초",
      price: 150000,
      defaultQuantity: 6,
      meta: "30초 이내 균일 · 숏폼 부스터",
      breakdownLabel: "30초 · 숏폼 부스터"
    }),
    Object.freeze({
      id: "m60",
      label: "1분",
      usesServiceLevel: true,
      needsLevelCheck: true,
      defaultQuantity: 4,
      meta: "Standard / Deluxe 중 선택",
      breakdownLabel: "1분",
      notice: "1분 영상은 Standard / Deluxe 중 어느 레벨로 진행할지 확인이 필요합니다."
    })
  ]),

  serviceLevels: Object.freeze([
    Object.freeze({ id: "standard", label: "Standard", price: 300000, segLabel: "Standard · 30만" }),
    Object.freeze({ id: "deluxe", label: "Deluxe", price: 700000, segLabel: "Deluxe · 70만" })
  ]),
  defaultServiceLevel: "standard",

  // approx: true 는 최소 기준가라 화면에 "~" 를 붙이고 상태를 노란색으로 내린다.
  // unit 이 있으면 수량 입력을 함께 띄운다.
  options: Object.freeze([
    Object.freeze({ id: "planS", name: "숏폼 기획", price: 200000, approx: true }),
    Object.freeze({ id: "planL", name: "롱폼 기획", price: 300000, approx: true }),
    Object.freeze({ id: "aiVoice", name: "AI 더빙", price: 50000, approx: true }),
    Object.freeze({ id: "caption", name: "자막", price: 50000, approx: true }),
    Object.freeze({ id: "studio", name: "스튜디오 대관", price: 100000, approx: true }),
    Object.freeze({ id: "shoot", name: "촬영", price: 500000, approx: false, note: "2시간 기준" }),
    Object.freeze({ id: "shootAdd", name: "촬영 추가", price: 250000, approx: false, unit: "시간" }),
    Object.freeze({ id: "revision", name: "수정 추가", price: 100000, approx: false, unit: "회" }),
    Object.freeze({ id: "voice", name: "성우 더빙", price: 200000, approx: true }),
    Object.freeze({ id: "model", name: "모델 섭외", price: 200000, approx: true }),
    Object.freeze({ id: "trans", name: "다국어 번역", price: 200000, approx: true }),
    Object.freeze({ id: "dub", name: "다국어 더빙", price: 200000, approx: true }),
    Object.freeze({ id: "bgm", name: "BGM", price: 50000, approx: true }),
    Object.freeze({ id: "aiVideo", name: "AI 영상 제작", price: 500000, approx: true }),
    Object.freeze({ id: "rush", name: "급행", price: 100000, approx: true })
  ]),

  // 화면에 미리 채워두는 예시 조건. 실제 고객 정보가 아닌 가공 샘플이다.
  sample: Object.freeze({
    client: "브랜드A사",
    inquiryType: "원본 소스 제공형 편집",
    stage: "1차 초안",
    subtitle: "브랜드A사 · 영상 제작 예상 견적 시뮬레이터"
  }),

  // 견적 상태 3종. tone 은 .status 의 색 클래스와 같다.
  states: Object.freeze({
    levelCheck: Object.freeze({
      tone: "red",
      label: "서비스 레벨 확인",
      title: "Standard / Deluxe 선택"
    }),
    approx: Object.freeze({
      tone: "yellow",
      label: "조건 확인 필요",
      title: "최소 기준가 포함"
    }),
    ready: Object.freeze({
      tone: "green",
      label: "바로 산출 가능",
      title: "기준 단가 범위",
      body: "현재 조건은 공개 단가표만으로 예상 견적을 산출할 수 있습니다."
    })
  })
});
