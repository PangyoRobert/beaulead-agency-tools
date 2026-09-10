# CLAUDE.md

이 저장소에서 작업하기 전에 루트의 `AGENTS.md`를 끝까지 읽고 모든 규칙을 따른다.

`AGENTS.md`가 Codex와 Claude의 공통 작업 규칙 원본이다. 이 파일에는 중복 규칙을 추가하지 않는다. 두 파일이 충돌하는 경우 `AGENTS.md`를 우선하고, 프로젝트 운영 규칙 변경은 `AGENTS.md`와 관련 문서를 함께 갱신한다.

필수 검증:

```sh
python3 scripts/validate_site.py
git diff --check
```

전체 작업 절차는 `docs/WORKFLOW.md`를 참고한다.
