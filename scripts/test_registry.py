#!/usr/bin/env python3
"""레지스트리 생성기 회귀 테스트.

생성기가 조용히 틀리는 게 이 구조의 유일한 위험이다. 마커 밖 내용을 건드리거나
들여쓰기를 흘리면 사이트가 깨지는데 JSON 만 보면 알 수 없다.
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import registry


failures: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  ok  {name}")
        return
    failures.append(f"{name}{f' — {detail}' if detail else ''}")
    print(f"  FAIL {name} {detail}")


def main() -> int:
    data = registry.load()

    print("레지스트리 자체 검증")
    errors = registry.validate(data)
    check("현재 레지스트리가 파일 시스템과 일치한다", not errors, "; ".join(errors))

    print("생성물 동기화")
    stale, broken = registry.apply(data, write=False)
    check("생성물에 drift 가 없다", not stale, ", ".join(stale))
    check("마커가 전부 제자리에 있다", not broken, "; ".join(broken))

    print("마커 처리")
    for filename, marker, render in registry.TARGETS:
        text = (registry.ROOT / filename).read_text(encoding="utf-8")
        head, tail = registry._split(text, filename, marker)
        rebuilt = f"{head}{render(data)}\n{tail}"
        check(f"{filename} 가 그대로 재생성된다", rebuilt == text)
        check(f"{filename} 마커 밖 본문이 보존된다", head in text and tail in text)

    # 들여쓰기를 흘리면 종료 마커가 줄 첫머리로 붙는다. 실제로 났던 버그라서
    # 저장소 파일이 아니라 합성 문서로 직접 고정한다.
    indented = (
        "<div>\n"
        "  <!-- registry:x:start -->\n"
        "  OLD\n"
        "  <!-- registry:x:end -->\n"
        "</div>\n"
    )
    head, tail = registry._split(indented, "<합성>", "x")
    check(
        "종료 마커 앞 들여쓰기가 보존된다",
        f"{head}  NEW\n{tail}"
        == "<div>\n  <!-- registry:x:start -->\n  NEW\n  <!-- registry:x:end -->\n</div>\n",
        repr(f"{head}  NEW\n{tail}"),
    )

    try:
        registry._split("마커 없음\n", "<합성>", "x")
        check("마커가 없으면 예외를 낸다", False)
    except ValueError:
        check("마커가 없으면 예외를 낸다", True)

    # 마커가 지워진 파일을 만나면 traceback 이 아니라 오류 메시지로 나와야 한다.
    original_targets = registry.TARGETS
    registry.TARGETS = (("docs/WORKFLOW.md", "structure", registry.render_readme),)
    try:
        stale, broken = registry.apply(data, write=False)
        check("마커 없는 파일은 보고만 하고 넘어간다", len(broken) == 1 and not stale)
        check("마커 오류가 check_all 로 올라온다", any("마커" in e for e in registry.check_all()))
    finally:
        registry.TARGETS = original_targets

    print("검증 규칙이 실제로 잡는지")

    stale = copy.deepcopy(data)
    live = next(e for e in stale["entries"] if e["status"] == "live" and e["card"])
    live["status"] = "planned"
    check(
        "live 페이지를 planned 로 되돌리면 실패한다",
        any("planned" in e for e in registry.validate(stale)),
    )

    missing = copy.deepcopy(data)
    missing["entries"] = [e for e in missing["entries"] if e["slug"] != "work"]
    check(
        "레지스트리에 없는 디렉토리를 잡는다",
        any("work/" in e for e in registry.validate(missing)),
    )

    ghost = copy.deepcopy(data)
    ghost["entries"].append(
        {"slug": "nope", "kind": "tool", "status": "planned", "public": False,
         "name": "없는 디렉토리", "card": None}
    )
    check(
        "디렉토리가 없는 항목을 잡는다",
        any("디렉토리가 없다" in e for e in registry.validate(ghost)),
    )

    dup = copy.deepcopy(data)
    dup["entries"].append(copy.deepcopy(dup["entries"][0]))
    check("slug 중복을 잡는다", any("중복" in e for e in registry.validate(dup)))

    print("카드 렌더링")
    cards = registry.render_cards(data)
    for entry in registry.tools_with_cards(data):
        check(
            f"{entry['slug']} 카드가 렌더링된다",
            f'href="./{entry["slug"]}/"' in cards
            and entry["card"]["description"] in cards,
        )
    for entry in data["entries"]:
        if entry.get("card"):
            continue
        check(
            f"{entry['slug']} 는 카드에 안 나온다",
            f'href="./{entry["slug"]}/"' not in cards,
        )

    if failures:
        print(f"\n{len(failures)} 개 실패:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print("\n전부 통과")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
