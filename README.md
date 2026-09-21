# Beaulead Agency Tools

고객 제안과 내부 의사결정을 위한 디지털 에이전시 인터랙티브 아티팩트 모음입니다.

## Structure

<!-- registry:structure:start — data/tools.json 에서 생성합니다. 직접 고치지 마세요. -->
- `video-quote/` — 영상 제작 견적기
- `development-quote/` — 홈페이지·랜딩 수정 및 상세페이지 개발 예상 견적기 (저장소에만 있음 — 배포 제외)
- `google-ads-training-quote/` — Google Ads 교육 상품 예상 견적기
- `youtube-creator-quote/` — 카페24·유튜브 쇼핑 크리에이터 제휴 견적기
- `youtube-view-quote/` — 유튜브 조회수 보장형 광고 상품 가격표
- `ad-quote/` — 광고 운영 견적 (예정)
- `content-quote/` — 콘텐츠 제작 견적 (예정)
- `media-plan/` — 미디어 플랜 (예정)
- `campaign-planner/` — 캠페인 플래너 (예정)
- `reporting-dashboard/` — 성과 대시보드 (예정)
- `client-demos/` — 공개 가능한 고객사별 시연본 (예정)
- `work/` — 고객사 레퍼런스 목록
- `shared/` — 공통 스크립트와 브랜드 자산
- `data/` — 레지스트리 등 생성 원본 데이터 (저장소에만 있음 — 배포 제외)
- `docs/` — 운영 문서 (저장소에만 있음 — 배포 제외)
- `scripts/` — 저장소 검증·생성 도구 (저장소에만 있음 — 배포 제외)
<!-- registry:structure:end -->

루트 `index.html`은 공개 시연 도구를 연결하는 허브입니다. 디렉토리를 추가하거나 이름을 바꿀 때는 `data/tools.json`만 고치고 `python3 scripts/sync_registry.py --write`를 실행하세요.

## Workflow

모든 변경은 기능 브랜치에서 작업하고 자동 검증을 통과한 Pull Request로 `main`에 병합합니다. `main` 병합 후 GitHub Pages가 자동 배포됩니다.

```sh
python3 scripts/validate_site.py
git diff --check
```

에이전트 공통 규칙은 `AGENTS.md`, 전체 작업 절차는 `docs/WORKFLOW.md`를 참고하세요.
