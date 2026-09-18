window.YOUTUBE_CREATOR_CONFIG = Object.freeze({
  // 지원비: 사용자 확정 범위 10만~20만원, 전원 동일 지급. 기본값은 범위 중앙값.
  supportFee: Object.freeze({
    min: 100000,
    max: 200000,
    step: 10000,
    default: 150000
  }),
  // CPS 과금 수수료율: 사용자 확정 15%.
  commissionRate: Object.freeze({
    min: 0.05,
    max: 0.3,
    step: 0.01,
    default: 0.15
  }),
  // 목표 ROAS·객단가·인플루언서 명수는 확정값이 없으므로 기본값을 두지 않는다.
  // 사용하는 사람이 직접 입력한다.
  // 고정비도 마찬가지다. 기본값 0 은 "아직 안 넣었다"는 뜻이지 확정된 금액이 아니다.
  fixedCost: Object.freeze({
    default: 0,
    hint: "영상 제작비·대행 수수료처럼 명수와 상관없이 한 번 나가는 비용. 없으면 0."
  }),
  scenarioLabels: Object.freeze(["시나리오 A", "시나리오 B", "시나리오 C"]),
  // 화면과 복사 요약에 항상 함께 표기해야 하는 ROAS 정의.
  // 고정비를 넣으면 분모의 구성이 달라지므로 문구도 함께 바뀐다.
  roasScopeNotice:
    "본 ROAS는 크리에이터 지원비와 CPS 수수료만을 분모로 계산했습니다. " +
    "영상 제작비·광고 매체비·대행 수수료는 포함되지 않았습니다.",
  roasScopeNoticeWithFixedCost:
    "본 ROAS는 크리에이터 지원비, CPS 수수료, 입력한 고정비를 분모로 계산했습니다. " +
    "고정비 칸에 넣지 않은 비용은 여전히 빠져 있습니다."
});
