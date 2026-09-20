#!/usr/bin/env python3
"""배포 경계 회귀 테스트.

이 경계가 조용히 뒤집히면 작업 규칙과 검증 스크립트가 다시 공개된다. 그런 일이
실제로 있었기 때문에(Pages 가 루트를 통째로 서빙하던 동안 `/AGENTS.md` 가 200)
무엇이 나가고 무엇이 안 나가는지 테스트로 고정한다.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_site
import registry


failures: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  ok  {name}")
        return
    failures.append(f"{name}{f' — {detail}' if detail else ''}")
    print(f"  FAIL {name} {detail}")


def main() -> int:
    shipped = build_site.build()
    relative = {p.relative_to(build_site.OUTPUT).as_posix() for p in shipped}

    print("빌드 자체 검사")
    errors = build_site.audit(shipped)
    check("audit 가 통과한다", not errors, "; ".join(errors))

    print("나가면 안 되는 것")
    for path in (
        "AGENTS.md",
        "CLAUDE.md",
        "README.md",
        "docs/WORKFLOW.md",
        "scripts/validate_site.py",
        "scripts/registry.py",
        "scripts/build_site.py",
        "data/tools.json",
        "data/tools.schema.md",
        "shared/README.md",
    ):
        check(f"{path} 가 빠진다", path not in relative)

    # 스텁 디렉토리는 public:false 라 통째로 안 나간다.
    data = registry.load()
    for entry in data["entries"]:
        if entry["public"]:
            continue
        leaked = [r for r in relative if r.startswith(f"{entry['slug']}/")]
        check(f"{entry['slug']}/ 가 통째로 빠진다", not leaked, ", ".join(leaked))

    print("나가야 하는 것")
    check("루트 index.html 이 나간다", "index.html" in relative)
    for entry in data["entries"]:
        if not entry["public"] or entry["kind"] == "support":
            continue
        check(f"{entry['slug']}/index.html 이 나간다", f"{entry['slug']}/index.html" in relative)
    for asset in ("shared/money-input.js", "shared/brand/favicon.ico", "work/cases.js"):
        check(f"{asset} 가 나간다", asset in relative)

    print("경계가 레지스트리에서 나오는지")
    check(
        "공개 디렉토리 목록이 public 필드와 일치한다",
        build_site.public_slugs()
        == [e["slug"] for e in data["entries"] if e["public"]],
    )

    print("audit 가 실제로 잡는지")
    (build_site.OUTPUT / "AGENTS.md").write_text("샘", encoding="utf-8")
    leaked_shipped = sorted(p for p in build_site.OUTPUT.rglob("*") if p.is_file())
    check(
        "새어나간 내부 파일을 잡는다",
        any("새어나갔다" in e for e in build_site.audit(leaked_shipped)),
    )

    (build_site.OUTPUT / "video-quote" / "index.html").unlink()
    check(
        "깨진 링크를 잡는다",
        any("빌드 결과에 없다" in e for e in build_site.audit(leaked_shipped)),
    )

    build_site.build()  # 검사용으로 더럽힌 결과를 되돌린다

    if failures:
        print(f"\n{len(failures)} 개 실패:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print("\n전부 통과")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
