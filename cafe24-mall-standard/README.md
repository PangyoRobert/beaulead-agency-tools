# Cafe24 Mall Standard Plan

카페24 자사몰 개발·기획 8주 표준 진행안(주차별 일정, 투입 인력, 최소 비용)을 안내하는 공개 페이지입니다.

## 손으로 고치지 않는다

`index.html`과 `styles.css`는 비공개 저장소 `PangyoRobert/mall-dev-roadmap`이 생성한 결과입니다. 내용 수정은 그 저장소의 `data/projects/cafe24-mall-standard/`에서 하고 아래로 다시 생성합니다.

```sh
cd ~/mall-dev-roadmap
npm run build:agency-tools -- cafe24-mall-standard ~/beaulead-agency-tools/cafe24-mall-standard
```

여기서 직접 고치면 다음 생성 때 사라집니다.

## 검증

```sh
python3 scripts/validate_site.py
```
