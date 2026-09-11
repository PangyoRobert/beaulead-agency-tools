window.GOOGLE_ADS_TRAINING_CONFIG = Object.freeze({
  vatRate: 0.1,
  packages: [
    {
      id: "basic-offline",
      name: "기본 교육",
      format: "오프라인",
      durationHours: 4,
      price: 1960000,
      note: "기본 교육 커리큘럼을 4시간 오프라인으로 진행합니다."
    },
    {
      id: "custom-offline",
      name: "맞춤 교육",
      format: "오프라인",
      durationHours: 4,
      price: 2360000,
      note: "교육 내용 협의 후 4시간 오프라인으로 진행합니다."
    },
    {
      id: "custom-remote",
      name: "원격 비대면 교육",
      format: "맞춤",
      durationHours: 1,
      price: 390000,
      note: "협의한 맞춤 교육을 1시간 원격 비대면으로 진행합니다."
    }
  ]
});
