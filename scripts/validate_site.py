#!/usr/bin/env python3
"""Validate public HTML entry points, repository-local links, and the registry."""

from __future__ import annotations

import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_colors
import registry


ROOT = Path(__file__).resolve().parents[1]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.html_lang = False
        self.has_viewport = False
        self.in_title = False
        self.title_parts: list[str] = []
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "html" and values.get("lang"):
            self.html_lang = True
        elif tag == "meta" and values.get("name", "").lower() == "viewport":
            self.has_viewport = bool(values.get("content"))
        elif tag == "title":
            self.in_title = True
        elif tag == "a" and values.get("href"):
            self.links.append(values["href"] or "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()


def link_target(page: Path, href: str) -> Path | None:
    parsed = urlsplit(href)
    if parsed.scheme or parsed.netloc or href.startswith(("#", "mailto:", "tel:")):
        return None

    relative = unquote(parsed.path)
    if not relative:
        return None

    target = (page.parent / relative).resolve()
    try:
        target.relative_to(ROOT)
    except ValueError:
        raise ValueError(f"link escapes repository: {href}")

    if relative.endswith("/") or target.is_dir():
        target = target / "index.html"
    return target


def main() -> int:
    # 레지스트리가 낡았거나 생성물이 손으로 수정됐으면 여기서 걸린다.
    errors: list[str] = registry.check_all()

    # `_site/` 는 원본을 복사한 빌드 산출물이다. 같이 훑으면 같은 페이지를 두 번
    # 검사하게 되고, 빌드를 했는지 여부에 따라 검증 결과가 달라진다.
    pages = sorted(
        page
        for page in ROOT.rglob("index.html")
        if not set(page.relative_to(ROOT).parts) & registry.IGNORED_DIRS
    )

    if ROOT / "index.html" not in pages:
        errors.append("missing root index.html")

    for page in pages:
        relative_page = page.relative_to(ROOT)
        parser = PageParser()
        try:
            parser.feed(page.read_text(encoding="utf-8"))
        except (OSError, UnicodeError) as exc:
            errors.append(f"{relative_page}: cannot read UTF-8 HTML ({exc})")
            continue

        if not parser.html_lang:
            errors.append(f"{relative_page}: missing html lang")
        if not parser.has_viewport:
            errors.append(f"{relative_page}: missing viewport meta")
        if not parser.title:
            errors.append(f"{relative_page}: missing title")

        for href in parser.links:
            try:
                target = link_target(page, href)
            except ValueError as exc:
                errors.append(f"{relative_page}: {exc}")
                continue
            if target is not None and not target.exists():
                errors.append(f"{relative_page}: broken local link {href}")

    if errors:
        print("Site validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    # 브랜드 토큰으로 전환한 페이지에 토큰 밖 색이 들어왔는지 본다.
    if check_colors.main() != 0:
        return 1

    print(
        f"Validated {len(pages)} HTML entry point(s); local links are valid; "
        "registry and generated files agree."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
