#!/usr/bin/env python3
"""`data/tools.json` 에서 생성되는 파일들을 갱신하거나 어긋났는지 검사한다.

    python3 scripts/sync_registry.py --write    # 생성물을 다시 쓴다
    python3 scripts/sync_registry.py --check    # 어긋나면 1 로 끝난다

`--check` 는 `scripts/validate_site.py` 가 이미 포함해서 돌린다. 이 스크립트를
따로 부르는 건 `--write` 로 생성물을 갱신할 때다.
"""

from __future__ import annotations

import argparse

import registry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true", help="생성물을 다시 쓴다")
    group.add_argument("--check", action="store_true", help="어긋나면 실패한다")
    args = parser.parse_args()

    data = registry.load()
    errors = registry.validate(data)
    if errors:
        print("레지스트리 검증 실패:")
        for error in errors:
            print(f"- {error}")
        return 1

    changed, broken = registry.apply(data, write=args.write)
    if broken:
        print("마커를 찾지 못했다:")
        for problem in broken:
            print(f"- {problem}")
        return 1

    if args.check:
        if changed:
            print("생성물이 data/tools.json 과 어긋난다:")
            for name in changed:
                print(f"- {name}")
            print("`python3 scripts/sync_registry.py --write` 를 실행할 것")
            return 1
        print("생성물이 data/tools.json 과 일치한다.")
        return 0

    if changed:
        print("갱신함:")
        for name in changed:
            print(f"- {name}")
    else:
        print("이미 최신 상태다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
