# Beaulead Agency Tools

고객 제안과 내부 의사결정을 위한 디지털 에이전시 인터랙티브 아티팩트 모음입니다.

## Structure

- `video-quote/` — 영상 제작 견적기
- `development-quote/` — 홈페이지·랜딩 수정 및 상세페이지 개발 예상 견적기
- `google-ads-training-quote/` — Google Ads 교육 상품 예상 견적기
- `ad-quote/` — 광고 운영 견적
- `content-quote/` — 콘텐츠 제작 견적
- `media-plan/` — 미디어 플랜
- `campaign-planner/` — 캠페인 플래너
- `reporting-dashboard/` — 성과 대시보드
- `client-demos/` — 고객사별 시연본
- `shared/` — 공통 스타일과 리소스

루트 `index.html`은 공개 시연 도구를 연결하는 허브입니다.

## Workflow

모든 변경은 기능 브랜치에서 작업하고 자동 검증을 통과한 Pull Request로 `main`에 병합합니다. `main` 병합 후 GitHub Pages가 자동 배포됩니다.

```sh
python3 scripts/validate_site.py
git diff --check
```

에이전트 공통 규칙은 `AGENTS.md`, 전체 작업 절차는 `docs/WORKFLOW.md`를 참고하세요.
