#!/usr/bin/env python3
from __future__ import annotations

import argparse

from _openapi_contract import (
    collect_differences,
    dump_json,
    filter_approved_differences,
    load_json,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Diff two normalized OpenAPI JSON documents.",
    )
    parser.add_argument("--baseline", required=True, help="Normalized legacy API baseline JSON.")
    parser.add_argument("--candidate", required=True, help="Normalized Spring candidate JSON.")
    parser.add_argument(
        "--approved-diffs",
        required=True,
        help="JSON file listing approved exact and prefix JSON Pointer paths.",
    )
    parser.add_argument("--out", required=True, help="Output path for the machine-readable diff.")
    args = parser.parse_args()

    raw_differences = collect_differences(
        load_json(args.baseline),
        load_json(args.candidate),
    )
    filtered_differences = filter_approved_differences(
        raw_differences,
        load_json(args.approved_diffs),
    )

    approved = [item for item in filtered_differences if item["approved"]]
    unapproved = [item for item in filtered_differences if not item["approved"]]
    report = {
        "compatible": not unapproved,
        "approved_difference_count": len(approved),
        "unapproved_difference_count": len(unapproved),
        "differences": filtered_differences,
    }
    dump_json(report, args.out)

    if unapproved:
        print(
            f"OpenAPI diff found {len(unapproved)} unapproved difference(s). "
            f"See {args.out} for details."
        )
        return 1

    print(
        f"OpenAPI diff passed with {len(approved)} approved difference(s). "
        f"Report written to {args.out}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
