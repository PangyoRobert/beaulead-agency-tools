#!/usr/bin/env python3
"""공개할 파일만 골라 `_site/` 로 모은다.

Pages 가 `main` 루트를 통째로 서빙하던 동안 `/AGENTS.md`, `/CLAUDE.md`,
`/scripts/*.py`, `/data/tools.json` 이 전부 공개 200 이었다. 작업 규칙과 검증
스크립트는 고객에게 보여줄 것이 아니다.

무엇을 내보낼지는 `data/tools.json` 의 `public` 필드가 정한다. 목록을 여기에 또
적으면 레지스트리를 만든 의미가 없다.

    python3 scripts/build_site.py            # _site/ 를 만든다
    python3 scripts/build_site.py --manifest # 무엇이 나가는지만 출력한다
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))

import registry
from validate_site import PageParser


ROOT = registry.ROOT
OUTPUT = ROOT / "_site"

# 공개 디렉토리 안에 있어도 내보내지 않는다. README 는 저장소 문서이지 사이트가 아니다.
EXCLUDED_NAMES = {"README.md", "__pycache__", ".DS_Store"}

# 빌드 결과에 절대 있으면 안 되는 것. 규칙이 조용히 뒤집히면 여기서 걸린다.
FORBIDDEN = ("AGENTS.md", "CLAUDE.md", "README.md", "docs", "scripts", "data")


def public_slugs() -> list[str]:
    data = registry.load()
    errors = registry.validate(data)
    if errors:
        raise SystemExit("레지스트리가 유효하지 않다:\n- " + "\n- ".join(errors))
    return [e["slug"] for e in data["entries"] if e["public"]]


def _ignore(directory: str, names: list[str]) -> set[str]:
    return {name for name in names if name in EXCLUDED_NAMES}


def build() -> list[Path]:
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()

    shutil.copy2(ROOT / "index.html", OUTPUT / "index.html")
    for slug in public_slugs():
        shutil.copytree(ROOT / slug, OUTPUT / slug, ignore=_ignore)

    return sorted(p for p in OUTPUT.rglob("*") if p.is_file())


def audit(shipped: list[Path]) -> list[str]:
    """내보낸 결과가 실제로 안전하고 온전한지 본다."""
    errors: list[str] = []
    relative = {p.relative_to(OUTPUT).as_posix() for p in shipped}

    for name in FORBIDDEN:
        leaked = sorted(r for r in relative if r == name or r.startswith(f"{name}/"))
        if leaked:
            errors.append(f"내부 파일이 새어나갔다: {', '.join(leaked)}")

    if "index.html" not in relative:
        errors.append("루트 index.html 이 빠졌다")

    # 링크가 안 나간 파일을 가리키면 배포된 사이트에서 404 가 된다.
    for page in sorted(OUTPUT.rglob("*.html")):
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        for href in parser.links:
            parsed = urlsplit(href)
            if parsed.scheme or parsed.netloc or href.startswith(("#", "mailto:", "tel:")):
                continue
            if not parsed.path:
                continue
            target = (page.parent / unquote(parsed.path)).resolve()
            if target.is_dir() or parsed.path.endswith("/"):
                target = target / "index.html"
            if not target.exists():
                errors.append(
                    f"{page.relative_to(OUTPUT)}: {href} 가 빌드 결과에 없다"
                )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest", action="store_true", help="빌드하고 내보낸 파일 목록을 출력한다"
    )
    args = parser.parse_args()

    shipped = build()
    errors = audit(shipped)
    if errors:
        print("빌드 검사 실패:")
        for error in errors:
            print(f"- {error}")
        return 1

    if args.manifest:
        for path in shipped:
            print(f"  {path.relative_to(OUTPUT).as_posix()}")

    print(f"_site/ 에 {len(shipped)} 개 파일. 공개 디렉토리: {', '.join(public_slugs())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
