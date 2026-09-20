# tools.json 스키마

`data/tools.json`은 이 저장소 디렉토리 구성의 단일 원천이다. 루트 `index.html`의
도구 카드, `README.md`와 `AGENTS.md`의 구조 목록이 전부 여기서 생성된다.

목록을 손으로 고치면 `python3 scripts/validate_site.py`가 실패한다. 고칠 곳은
이 JSON 하나이고, 그 다음 `python3 scripts/sync_registry.py --write`를 실행한다.

## root

| 키 | 설명 |
| --- | --- |
| `name` | 루트 `index.html`을 가리키는 한 줄 설명. `AGENTS.md` 목록 첫 줄이 된다. |

## entries[]

| 키 | 타입 | 설명 |
| --- | --- | --- |
| `slug` | string | 디렉토리 이름. 실제로 존재해야 한다. |
| `kind` | `tool` \| `page` \| `support` | `tool`은 에이전시 도구, `page`는 카드 없는 공개 페이지(`work/`), `support`는 도구가 아닌 디렉토리(`shared/`, `docs/`, `scripts/`, `data/`). |
| `status` | `live` \| `planned` | `live`는 페이지가 실제로 있는 상태, `planned`는 디렉토리만 잡아둔 상태. |
| `public` | boolean | GitHub Pages로 공개되어야 하는지. 배포 allowlist와 sitemap 생성이 이 값을 읽도록 설계했다(아직 미연결). |
| `name` | string | 문서 목록에 쓰는 한국어 이름. |
| `card` | object \| null | 루트 허브에 카드를 내보낼 때만 채운다. `status`가 `live`일 때만 허용된다. |

### card

| 키 | 타입 | 설명 |
| --- | --- | --- |
| `kicker` | string | 카드 상단 라벨. 예: `External Calculator` |
| `title` | string[] | 카드 제목. 배열 원소 사이가 `<br>`로 줄바꿈된다. |
| `description` | string | 카드 본문 한 문단. |

## 검증 규칙

`scripts/registry.py`가 다음을 강제한다. 하나라도 어긋나면 검증이 실패한다.

- `slug` 중복 금지, `slug` 디렉토리 실제 존재.
- `status: live`인 `tool`/`page`는 `<slug>/index.html`이 있어야 한다.
- `status: planned`인데 `<slug>/index.html`이 생겼으면 실패한다 — 레지스트리를
  갱신하지 않고 페이지만 만든 경우를 잡는다.
- `card`가 있으면 `status`는 `live`여야 한다.
- 루트의 모든 디렉토리가 레지스트리에 있어야 한다(`.git`, `.github` 제외) —
  새 디렉토리를 만들고 등록을 잊은 경우를 잡는다.
- 생성 대상 파일 3종이 레지스트리에서 생성한 결과와 일치해야 한다.

## 새 도구를 추가하는 순서

1. `<slug>/index.html`을 만든다.
2. `data/tools.json`에 항목을 추가한다(`status: "live"`, 카드가 필요하면 `card`도).
3. `python3 scripts/sync_registry.py --write`
4. `python3 scripts/validate_site.py`
