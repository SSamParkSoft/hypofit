#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from _openapi_contract import dump_json, fetch_json, load_json


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export a Spring OpenAPI JSON document from a URL or local JSON file.",
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--url", help="Spring OpenAPI URL, usually /v3/api-docs.")
    source.add_argument(
        "--input-file",
        help="Existing Spring OpenAPI JSON file to copy into the contract workspace.",
    )
    parser.add_argument(
        "--out",
        required=True,
        help="Output path for the raw Spring OpenAPI JSON document.",
    )
    args = parser.parse_args()

    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if args.url:
        dump_json(fetch_json(args.url), output_path)
        print(f"Fetched Spring OpenAPI from {args.url} into {args.out}")
        return 0

    input_path = Path(args.input_file)
    dump_json(load_json(input_path), output_path)
    if input_path.resolve() != output_path.resolve():
        print(f"Copied Spring OpenAPI JSON from {input_path} into {args.out}")
    else:
        print(f"Validated Spring OpenAPI JSON at {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
