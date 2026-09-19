// 유튜브 조회수 보장형 상품의 확정 판매 조건.
// 이 파일이 가격의 단일 원본이다. 추후 뷰리드 내부 워크스페이스 버전이 만들어지면
// 같은 값을 여기서 읽어가고, 화면 쪽에는 금액을 다시 적지 않는다.
//
// 공개 페이지이므로 원가, 매체비 비중, 마진, 조회당 단가는 이 파일에 넣지 않는다.
// 조회당 단가는 판매 대화에서 다루지 않기로 한 값이라 화면에도 표시하지 않는다.
window.YOUTUBE_VIEW_CONFIG = Object.freeze({
  vatRate: 0.1,
  // 노출수는 예상 구간이다. 영상과 업종에 따라 달라지므로 화면에서도 예상으로 표기한다.
  packages: Object.freeze([
    Object.freeze({
      id: "light",
      tier: "LIGHT",
      name: "1만 조회 보장",
      guaranteedViews: 10000,
      supplyPrice: 990000,
      impressionsMin: 500000,
      impressionsMax: 750000,
      audience: "처음 유튜브 광고를 집행해 보는 개인·소규모 사업자"
    }),
    Object.freeze({
      id: "standard",
      tier: "STANDARD",
      name: "2만 조회 보장",
      guaranteedViews: 20000,
      supplyPrice: 1990000,
      impressionsMin: 1000000,
      impressionsMax: 1500000,
      audience: "채널을 본격적으로 키우려는 개인사업자·중소기업"
    }),
    Object.freeze({
      id: "premium",
      tier: "PREMIUM",
      name: "3만 조회 보장",
      guaranteedViews: 30000,
      supplyPrice: 2890000,
      impressionsMin: 1500000,
      impressionsMax: 2250000,
      audience: "브랜드 인지도를 빠르게 끌어올려야 하는 기업"
    })
  ]),
  notices: Object.freeze([
    Object.freeze({
      title: "보장 방식",
      body: "정해진 조회수에 도달할 때까지 집행합니다. 목표에 못 미친 채로 종료되지 않습니다."
    }),
    Object.freeze({
      title: "성과 확인",
      body: "유튜브 스튜디오 분석 화면에서 조회수가 올라가는 것을 직접 확인하실 수 있습니다."
    }),
    Object.freeze({
      title: "노출수",
      body: "표기된 노출 구간은 예상치입니다. 영상과 업종에 따라 달라집니다."
    }),
    Object.freeze({
      title: "광고 계정",
      body: "운영은 뷰리드 광고 계정에서 진행하며, 광고 계정 접근 권한은 제공되지 않습니다."
    }),
    Object.freeze({
      title: "집행 불가 콘텐츠",
      body: "성인·도박·불법 의약품·저작권 침해·폭력 콘텐츠는 구글 정책상 집행할 수 없습니다. 확인되면 전액 환불합니다."
    }),
    Object.freeze({
      title: "환불",
      body: "광고 시작 전에는 전액 환불됩니다. 시작 후에는 이미 집행된 금액을 제외하고 환불됩니다."
    })
  ]),
  steps: Object.freeze([
    Object.freeze({ title: "영상 확인", body: "집행할 영상이 구글 광고 정책에 맞는지 먼저 확인합니다." }),
    Object.freeze({ title: "캠페인 설정", body: "영상 주제에 관심이 있을 시청자에게 닿도록 타겟을 설정합니다." }),
    Object.freeze({ title: "집행", body: "보장 조회수에 도달할 때까지 집행합니다." }),
    Object.freeze({ title: "리포트", body: "협의한 주기에 맞춰 성과 리포트를 보내드립니다." })
  ])
});
