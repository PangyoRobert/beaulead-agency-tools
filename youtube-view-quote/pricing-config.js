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
  // 보장형은 뷰리드 통합 계정에서 돌아가므로 운영 방식이 일반 대행과 다르다.
  // 성과 확인 수단과 계정 권한 제한은 맞바꾸는 조건이라 한 섹션에 붙여 둔다.
  // 떼어 놓으면 "권한을 안 준다"만 남아 근거 없는 제약으로 읽힌다.
  operations: Object.freeze({
    lead: "보장형 상품은 빠른 집행과 약정한 성과의 확실한 이행을 위해, 뷰리드가 운영 노하우를 모아 둔 하나의 Google Ads 계정에서 집행됩니다. 그래서 운영 방식이 일반 광고 대행과 다르며, 아래 세 가지를 먼저 안내드립니다.",
    items: Object.freeze([
      Object.freeze({
        title: "고객사 도구로 직접 교차 확인",
        body: "뷰리드가 보내는 리포트만 보실 필요는 없습니다. 고객사 채널의 YouTube 스튜디오 애널리틱스에서 조회수가 얼마나 올랐는지, 어떤 경로로 들어왔는지 실시간으로 직접 대조하실 수 있습니다."
      }),
      Object.freeze({
        title: "정기 성과 리포트 발송",
        body: "협의한 주기에 맞춰 상세 리포트를 메일로 보내드립니다. 구글 광고 시스템의 원본 수치를 그대로 옮긴 지표라, 약정한 조회수가 계획대로 채워지고 있는지 직접 확인하실 수 있습니다."
      }),
      Object.freeze({
        title: "광고 계정 접근 권한 제한",
        body: "위와 같이 성과를 직접 확인하실 수 있게 하는 대신, 광고 계정에 접속하거나 직접 관리하실 수는 없습니다. 빠르게 집행하고 소액으로 테스트하고 싶다는 요구에 수년간 대응하며 자리 잡은 운영 방식입니다.",
        points: Object.freeze([
          "타겟팅 설계 보호 — 보장형 상품에는 뷰리드가 오래 다듬어 온 타겟팅 방식이 들어갑니다.",
          "보안과 통합 운영 — 하나의 계정과 MCC 안에서 여러 캠페인이 함께 돌아갑니다. 다른 광고주의 정보와 계정 보안을 지켜야 해서 개별 권한을 드리기 어렵습니다."
        ])
      })
    ])
  }),
  notices: Object.freeze([
    Object.freeze({
      title: "보장 방식",
      body: "정해진 조회수에 도달할 때까지 집행합니다. 목표에 못 미친 채로 종료되지 않습니다."
    }),
    Object.freeze({
      title: "노출수",
      body: "표기된 노출 구간은 예상치입니다. 영상과 업종에 따라 달라집니다."
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
