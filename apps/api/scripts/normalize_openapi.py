#!/usr/bin/env python3
from __future__ import annotations

import argparse

from _openapi_contract import dump_json, load_json, normalize_openapi


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Normalize an OpenAPI JSON document for stable contract diffing.",
    )
    parser.add_argument("--input", required=True, help="Input OpenAPI JSON file.")
    parser.add_argument("--out", required=True, help="Output path for normalized JSON.")
    args = parser.parse_args()

    dump_json(normalize_openapi(load_json(args.input)), args.out)
    print(f"Normalized OpenAPI document into {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
