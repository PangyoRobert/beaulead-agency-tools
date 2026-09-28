// 바이럴 마케팅 서비스 메뉴(모듈 M1~M6)와 예산대별 패키지 1차 초안의 확정 원본.
// 전부 사용자가 제시한 5가지 바이럴 메커니즘을 근거로 담당자가 직접 정리한 값이며,
// 이 파일이 단일 원본이다. index.html 은 이 값을 읽어 그리기만 하고 금액·문구를
// 다시 적지 않는다.
//
// 1차 초안이다. 예산 구간은 다른 견적기처럼 "공급가 하나"가 아니라 범위(예: 300만~
// 500만 원)로 제시된 값이라 임의로 단일가로 좁히지 않았다. 부가세·원가·마진 비중은
// 이 파일에도, 화면에도 넣지 않는다(공개 저장소 안전 규칙).
window.VIRAL_MARKETING_CONFIG = Object.freeze({
  vatRate: 0.1,

  // 서비스 메뉴 구조(Module Architecture). 대행사가 단품(A la carte) 모듈로 파는
  // 개별 바이럴 기술을 광고주 목적에 맞춰 조합한다는 전제를 그대로 옮겼다.
  modules: Object.freeze([
    Object.freeze({
      id: "M1",
      name: "크리에이터 바이럴",
      items: Object.freeze([
        Object.freeze({
          name: "마이크로 시딩 팩",
          body: "팔로워 1천~3만 명 대상 대량 협찬 및 가이드라인 기반 실사용 후기 배포 (20인 / 50인 / 100인 단위)"
        }),
        Object.freeze({
          name: "공동 작성자(Collab) 릴스",
          body: "미들급 크리에이터(팔로워 5만~20만)와 브랜드 공식 계정을 공동 작성자로 지정하여 공동 노출"
        }),
        Object.freeze({
          name: "브랜디드 웹툰/시트콤",
          body: "기획형 크리에이터 협업을 통한 제품 PPL 및 숏폼 드라마/웹툰 형태의 정교한 브랜디드 콘텐츠"
        })
      ])
    }),
    Object.freeze({
      id: "M2",
      name: "DM 자동화 인터랙티브",
      items: Object.freeze([
        Object.freeze({
          name: "ManyChat 시나리오 세팅",
          body: "특정 댓글 키워드 감지 시 자동 DM 발송 시스템 구축 (할인 쿠폰, 자사몰/올영/쿠팡 UTM 링크 연동)"
        }),
        Object.freeze({
          name: "알고리즘 붐업 캠페인",
          body: "댓글 1,000개 이상 유도하는 이벤트 구조 기획 + 계정 간 깊은 상호작용을 통한 탐색 탭 강제 노출"
        })
      ])
    }),
    Object.freeze({
      id: "M3",
      name: "UGC & 챌린지",
      items: Object.freeze([
        Object.freeze({
          name: "참여형 릴스 챌린지",
          body: "음원, 템플릿, AR 필터 제작 + 초기 챌린지 붐업을 위한 인플루언서 10~20인 마중물 시딩"
        }),
        Object.freeze({
          name: "리뷰 자산화 & 리그램",
          body: "자발적 구매 인증 유도 태그 이벤트 기획 + 2차 활용(공식 계정 게시/퍼포먼스 소재) 권한 확보"
        })
      ])
    }),
    Object.freeze({
      id: "M4",
      name: "브랜드 페르소나 계정",
      items: Object.freeze([
        Object.freeze({
          name: "공식 계정 '세계관' 대행",
          body: "브랜드 색채를 낮춘 큐레이션/캐릭터 페르소나 구축 + 월 12~16개 숏폼/카드뉴스 기획·제작·운영"
        }),
        Object.freeze({
          name: "스토리텔링형 숏폼 연재",
          body: "연속성 있는 B급 숏폼 드라마 또는 연재형 웹툰 제작을 통한 자발적 팔로우 유도"
        })
      ])
    }),
    Object.freeze({
      id: "M5",
      name: "알고리즘 릴스 부스터",
      items: Object.freeze([
        Object.freeze({
          name: "Save & Share 꿀팁 콘텐츠",
          body: "정보 저장(Save)과 DM 공유(Share)를 극대화하는 카테고리별 꿀팁/비교 분석 숏폼 기획"
        })
      ])
    }),
    Object.freeze({
      id: "M6",
      name: "바이럴 x 퍼포먼스 결합",
      items: Object.freeze([
        Object.freeze({
          name: "메타 다크포스트(Dark Post)",
          body: "오가닉 반응이 터진 바이럴 게시글의 광고 권한을 받아 타깃팅 예산을 부스팅하는 퍼포먼스 결합"
        })
      ])
    })
  ]),

  // 금액대별 서비스 패키지 1차 초안. 단일 공급가가 아니라 월 집행 예산 "구간"으로
  // 제시된 값이라 range(min~max, 원 단위)로 그대로 둔다. 계산기가 아니라 가격표다 —
  // youtube-view-quote 와 같은 이유로, 임의 입력값을 받아 구간 사이 금액을 만들어
  // 내지 않는다.
  packages: Object.freeze([
    Object.freeze({
      id: "starter",
      tier: "STARTER",
      name: "스타터",
      budgetMin: 3000000,
      budgetMax: 5000000,
      purpose: "신규 인지도 확보 및 기본 검증",
      coreModules: Object.freeze([
        "나노/마이크로 시딩 (20인)",
        "알고리즘 릴스 (월 4편)",
        "기본 DM 자동화 세팅"
      ]),
      kpis: Object.freeze(["도달수(Reach)", "게시물 수(SOV)"]),
      badge: null,
      audience: "초기 신규 브랜드, 소상공인, 특정 단일 제품의 빠르게 시장 반응을 보려는 기업",
      strategy: "저비용 고효율 시딩과 저장 유도형 릴스로 타임라인 점유율(SOV)의 기초를 다집니다.",
      lineItems: Object.freeze([
        Object.freeze({
          title: "마이크로 시딩",
          body: "20명 (제품 협찬 및 핵심 소구점 가이드라인 적용)"
        }),
        Object.freeze({
          title: "알고리즘 릴스 제작",
          body: "월 4편 (저장 및 공유를 유도하는 정보성/꿀팁 포맷)"
        }),
        Object.freeze({
          title: "DM 자동화 세팅",
          body: "1개 캠페인 키워드-DM 자동 발송 가공 (ManyChat 세팅)"
        })
      ])
    }),
    Object.freeze({
      id: "growth",
      tier: "GROWTH",
      name: "그로스",
      budgetMin: 8000000,
      budgetMax: 12000000,
      purpose: "댓글 폭발, 알고리즘 노출 및 전환 연계",
      coreModules: Object.freeze([
        "마이크로 시딩 (50인)",
        "Collab 릴스 (2편)",
        "DM 자동화 + 붐업 캠페인",
        "Save&Share 릴스 (월 8편)"
      ]),
      kpis: Object.freeze(["댓글수", "DM 발송수", "랜딩 CTR"]),
      badge: "가장 선호도가 높은 메인 상품",
      audience: "매출 전환이 시급한 D2C 커머스 브랜드, 올리브영/쿠팡 입점 브랜드",
      strategy: "인플루언서 노출과 DM 자동화를 결합하여 인스타그램 알고리즘 상위 노출을 강제 유발하고, 자사몰/마켓으로 유입을 직결시킵니다.",
      lineItems: Object.freeze([
        Object.freeze({
          title: "마이크로/나노 시딩",
          body: "50명 (댓글 이벤트 동시 참여 유도)"
        }),
        Object.freeze({
          title: "Collab(공동작업) 릴스",
          body: "미들급 크리에이터 2명 협업 (브랜드 계정 공동 노출)"
        }),
        Object.freeze({
          title: "알고리즘 붐업 & DM 자동화",
          body: "댓글 폭발형 유저 참여 이벤트 기획 + 구매 랜딩 UTM 링크 자동 발송"
        }),
        Object.freeze({
          title: "Save & Share 릴스",
          body: "월 8편 제작 (트렌딩 음원 및 밈 패러디 즉각 반영)"
        })
      ])
    }),
    Object.freeze({
      id: "scale-up",
      tier: "SCALE-UP",
      name: "스케일업",
      budgetMin: 20000000,
      budgetMax: null,
      purpose: "대세감 형성, 브랜딩 및 팬덤 구축",
      coreModules: Object.freeze([
        "크리에이터 브랜디드 (3편)",
        "릴스 챌린지 또는 페르소나 대행",
        "DM 자동화 연동 커머스 숏핑",
        "메타 다크포스트 결합"
      ]),
      kpis: Object.freeze(["알고리즘 탐색 노출수", "자사몰/커머스 CVR"]),
      badge: null,
      audience: "카테고리 내 독점적 대세감을 형성하고자 하는 중대형 브랜드, 신제품 라인업 대형 론칭",
      strategy: "크리에이터 영향력, 브랜드 세계관 계정, 퍼포먼스 광고 결합(다크포스트)을 총동원하여 단순 바이럴을 넘어선 브랜딩과 대규모 전환을 동시에 달성합니다.",
      lineItems: Object.freeze([
        Object.freeze({
          title: "크리에이터 브랜디드 숏폼",
          body: "메가/미들급 3인 (기획형 웹툰, 시트콤, 고품질 리뷰)"
        }),
        Object.freeze({
          title: "브랜드 페르소나 계정 대행",
          body: "공식 계정의 바이럴 큐레이션 채널화 (월 12~16개 콘텐츠 제작 및 운영)"
        }),
        Object.freeze({
          title: "참여형 챌린지 또는 커머스 숏핑",
          body: "전용 템플릿/음원 기반 유저 참여 유도 및 플랫폼 랜딩 연동"
        }),
        Object.freeze({
          title: "바이럴 x 퍼포먼스 다크포스트",
          body: "오가닉 반응이 가장 높은 바이럴 소재 2~3개를 선별하여 Meta 광고 예산 투입 부스팅"
        })
      ])
    })
  ])
});
