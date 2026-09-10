# 작업 및 배포 프로세스

이 문서는 Codex 또는 Claude로 아티팩트를 수정하고 안전하게 GitHub Pages에 배포하는 표준 절차다.

## 1. 작업 시작

최신 `main`을 기준으로 하나의 목적만 가진 브랜치를 만든다.

```sh
git switch main
git pull --ff-only origin main
git switch -c feature/video-quote-client-preview
```

브랜치 이름은 다음 패턴을 사용한다.

- 신규 기능: `feature/<기능명>`
- 오류 수정: `fix/<문제명>`
- 문서·운영 규칙: `docs/<주제>`

에이전트에게 작업을 요청할 때는 대상 경로, 변경 목적, 제외 범위와 완료 검증 방법을 함께 명시한다.

## 2. 구현

- 새 도구는 해당 형제 디렉토리 안에 구현한다.
- 루트는 에이전시 홈페이지와 전체 도구 진입점으로 유지한다.
- 공통 요소는 `/shared/`로 분리하되, 기존 도구의 외형이나 동작이 바뀌는지 확인한다.
- 고객사별 자료는 공개 가능한 데이터인지 먼저 확인한다.
- 가격, 할인율, 예산 등 사업 판단이 필요한 수치는 승인된 자료만 사용한다.

## 3. 로컬 검증

```sh
python3 scripts/validate_site.py
git diff --check
python3 -m http.server 8000
```

브라우저에서 변경 페이지와 영향받지 않아야 하는 대표 페이지를 각각 확인한다. 모바일 폭에서도 GNB, 입력 요소와 결과 영역을 확인한다.

공통 파일을 수정했다면 영향받지 않아야 하는 페이지의 작업 전후 체크섬 또는 응답 파일을 비교한다.

## 4. 커밋과 push

```sh
git status
git add <변경한 파일>
git commit -m "Add client proposal artifact"
git push -u origin feature/video-quote-client-preview
```

관련 없는 변경을 같은 커밋에 포함하지 않는다. 인증정보나 고객 기밀이 포함되지 않았는지 push 전에 다시 확인한다.

## 5. Pull Request

GitHub에서 작업 브랜치를 `main`으로 병합하는 Pull Request를 연다. 제공되는 체크리스트를 작성하고 자동 검증 결과를 확인한다.

Pull Request에는 다음 내용을 포함한다.

- 무엇을 변경했는가
- 고객 시연에서 무엇을 확인할 수 있는가
- 변경하지 않은 범위는 무엇인가
- 실행한 검증과 실제 확인 주소
- 공개 데이터 안전성 확인 결과

자동 검증이 실패하면 원인을 수정한 뒤 같은 브랜치에 다시 push한다. 검증을 우회해 병합하지 않는다.

## 6. 병합과 자동 배포

검토와 자동 검증이 끝나면 Pull Request를 `main`에 병합한다. GitHub Pages가 자동으로 새 버전을 배포한다.

배포 후 확인할 주소:

- 메인: `https://pangyorobert.github.io/beaulead-agency-tools/`
- 영상 견적기: `https://pangyorobert.github.io/beaulead-agency-tools/video-quote/`

배포 작업이 완료됐는지 확인하고, 변경 페이지와 영향받지 않아야 하는 대표 페이지가 HTTP 200으로 응답하는지 확인한다.

## 7. 미팅 버전 고정

대면 시연에 사용할 버전이 확정되면 병합 커밋에 태그를 붙인다.

```sh
git switch main
git pull --ff-only origin main
git tag -a demo-2026-09-10-client -m "Client meeting demo"
git push origin demo-2026-09-10-client
```

태그 이름에는 고객 개인정보 대신 공개 가능한 짧은 식별자를 사용한다.

## 8. 복구

배포 후 문제가 발견되면 문제가 생긴 Pull Request의 병합 커밋을 GitHub에서 Revert하고, 새 Pull Request로 자동 검증을 거쳐 병합한다. 공개된 이력을 덮어쓰는 강제 push나 `git reset --hard`로 복구하지 않는다.
