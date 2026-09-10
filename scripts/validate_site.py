#!/usr/bin/env python3
"""Validate public HTML entry points and repository-local links."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


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
    errors: list[str] = []
    pages = sorted(ROOT.rglob("index.html"))

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

    print(f"Validated {len(pages)} HTML entry point(s); local links are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
