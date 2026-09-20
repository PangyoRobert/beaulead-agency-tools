#!/usr/bin/env python3
"""디렉토리 레지스트리(`data/tools.json`) 로더·검증기·생성기.

도구 목록이 루트 `index.html`, `README.md`, `AGENTS.md` 세 곳에 따로 적혀 있었고
셋이 실제로 어긋나 있었다(#14·#15 로 추가한 도구가 README 에 없었다). 그래서
목록을 `data/tools.json` 하나로 옮기고 나머지는 전부 여기서 생성한다.

런타임에 JSON 을 `fetch` 하지 않고 빌드 타임에 HTML 로 박아 넣는 이유: 견적
아티팩트는 `file://` 로 열고 인쇄까지 하는 용도라 `fetch` 가 동작하지 않는다.
`scripts/build_brand_assets.py` 와 같은 "원본에서 생성" 패턴을 따른다.
"""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "data" / "tools.json"

KINDS = {"tool", "page", "support"}
STATUSES = {"live", "planned"}

# 레지스트리에 올리지 않는 루트 항목. 디렉토리가 아니거나 Git/CI 의 것이다.
IGNORED_DIRS = {".git", ".github"}


def load() -> dict:
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def validate(registry: dict) -> list[str]:
    """스키마와 실제 파일 시스템이 맞는지 본다."""
    errors: list[str] = []

    if not registry.get("root", {}).get("name"):
        errors.append("data/tools.json: root.name 이 비어 있다")

    entries = registry.get("entries")
    if not isinstance(entries, list) or not entries:
        return errors + ["data/tools.json: entries 가 비어 있다"]

    seen: set[str] = set()
    for entry in entries:
        slug = entry.get("slug")
        where = f"data/tools.json[{slug!r}]"

        if not slug:
            errors.append("data/tools.json: slug 없는 항목이 있다")
            continue
        if slug in seen:
            errors.append(f"{where}: slug 가 중복된다")
        seen.add(slug)

        if entry.get("kind") not in KINDS:
            errors.append(f"{where}: kind 는 {sorted(KINDS)} 중 하나여야 한다")
        if entry.get("status") not in STATUSES:
            errors.append(f"{where}: status 는 {sorted(STATUSES)} 중 하나여야 한다")
        if not entry.get("name"):
            errors.append(f"{where}: name 이 비어 있다")
        if not isinstance(entry.get("public"), bool):
            errors.append(f"{where}: public 은 true/false 여야 한다")

        directory = ROOT / slug
        if not directory.is_dir():
            errors.append(f"{where}: 디렉토리가 없다")
            continue

        # status 가 실제 페이지 유무와 어긋나면 레지스트리가 낡은 것이다.
        has_page = (directory / "index.html").is_file()
        if entry.get("status") == "live" and entry.get("kind") != "support" and not has_page:
            errors.append(f"{where}: status 가 live 인데 {slug}/index.html 이 없다")
        if entry.get("status") == "planned" and has_page:
            errors.append(
                f"{where}: {slug}/index.html 이 생겼는데 status 가 아직 planned 다"
            )

        card = entry.get("card")
        if card is None:
            continue
        if entry.get("status") != "live":
            errors.append(f"{where}: planned 인데 루트 카드가 있다")
        if not card.get("kicker") or not card.get("description"):
            errors.append(f"{where}: card.kicker / card.description 이 비어 있다")
        if not isinstance(card.get("title"), list) or not card["title"]:
            errors.append(f"{where}: card.title 은 줄 단위 문자열 배열이어야 한다")

    # 레지스트리에 없는 디렉토리를 잡는다. 새 도구를 만들고 등록을 잊으면 여기서 막힌다.
    for child in sorted(ROOT.iterdir()):
        if not child.is_dir() or child.name in IGNORED_DIRS:
            continue
        if child.name not in seen:
            errors.append(f"{child.name}/: 디렉토리가 data/tools.json 에 없다")

    return errors


def tools_with_cards(registry: dict) -> list[dict]:
    return [e for e in registry["entries"] if e.get("card")]


def render_cards(registry: dict) -> str:
    """루트 index.html 의 `.tool-grid` 안쪽."""
    lines: list[str] = []
    for entry in tools_with_cards(registry):
        card = entry["card"]
        title = "<br>".join(card["title"])
        lines += [
            f'          <a class="tool-card" href="./{entry["slug"]}/">',
            "            <div>",
            f'              <span class="tool-kicker">{card["kicker"]}</span>',
            f"              <h2>{title}</h2>",
            f'              <p>{card["description"]}</p>',
            "            </div>",
            '            <span class="arrow" aria-hidden="true">↗</span>',
            "          </a>",
        ]
    return "\n".join(lines)


def _doc_line(entry: dict, *, prefix: str, planned_suffix: str) -> str:
    suffix = planned_suffix if entry["status"] == "planned" else ""
    return f"- `{prefix}{entry['slug']}/` — {entry['name']}{suffix}"


def render_readme(registry: dict) -> str:
    return "\n".join(
        _doc_line(e, prefix="", planned_suffix=" (예정)") for e in registry["entries"]
    )


def render_agents(registry: dict) -> str:
    lines = [f"- `/index.html` — {registry['root']['name']}"]
    lines += [
        _doc_line(e, prefix="/", planned_suffix=" (예정 — 아직 페이지 없음)")
        for e in registry["entries"]
    ]
    return "\n".join(lines)


# 생성 대상: (파일, 마커 이름, 렌더러)
TARGETS = (
    ("index.html", "tool-cards", render_cards),
    ("README.md", "structure", render_readme),
    ("AGENTS.md", "structure", render_agents),
)


def _markers(name: str) -> tuple[str, str]:
    return f"registry:{name}:start", f"registry:{name}:end"


def _split(text: str, path: str, name: str) -> tuple[str, str]:
    """마커 기준으로 (앞부분 끝, 뒷부분 시작) 오프셋을 찾아 앞/뒤를 돌려준다."""
    start_tag, end_tag = _markers(name)
    start = text.find(start_tag)
    end = text.find(end_tag)
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"{path}: {start_tag} / {end_tag} 마커를 찾지 못했다")

    head_end = text.index("\n", text.index("-->", start)) + 1
    # 종료 마커는 줄 첫머리부터 남긴다. 마커 위치에서 자르면 들여쓰기가 날아간다.
    tail_start = text.rfind("\n", 0, text.rindex("<!--", start, end)) + 1
    return text[:head_end], text[tail_start:]


def apply(registry: dict, *, write: bool) -> tuple[list[str], list[str]]:
    """생성물을 반영하거나(write) 검사한다. (어긋난 파일, 마커 오류) 를 돌려준다.

    마커가 없으면 손댈 위치를 모르므로 그 파일만 건너뛰고 오류로 보고한다. 예외를
    그대로 올리면 검증이 traceback 으로 죽어서 뭐가 문제인지 안 보인다.
    """
    stale: list[str] = []
    broken: list[str] = []
    for filename, marker, render in TARGETS:
        path = ROOT / filename
        current = path.read_text(encoding="utf-8")
        try:
            head, tail = _split(current, filename, marker)
        except ValueError as exc:
            broken.append(str(exc))
            continue
        updated = f"{head}{render(registry)}\n{tail}"
        if updated == current:
            continue
        stale.append(filename)
        if write:
            path.write_text(updated, encoding="utf-8")
    return stale, broken


def check_all() -> list[str]:
    """validate_site.py 가 부른다. 스키마·파일시스템·생성물 drift 를 한 번에 본다."""
    registry = load()
    errors = validate(registry)
    if errors:
        return errors
    stale, broken = apply(registry, write=False)
    return broken + [
        f"{name}: data/tools.json 과 어긋난다. `python3 scripts/sync_registry.py --write` 를 실행할 것"
        for name in stale
    ]
