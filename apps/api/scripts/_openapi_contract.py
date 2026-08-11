#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path
from typing import Any

HTTP_METHODS = ("get", "post", "put", "patch", "delete", "options", "head", "trace")
STRIP_KEYS = {
    "description",
    "example",
    "examples",
    "externalDocs",
    "operationId",
    "servers",
    "summary",
    "title",
}


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def load_json(path: str | Path) -> Any:
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def dump_json(data: Any, path: str | Path) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def fetch_json(url: str, timeout_seconds: float = 15.0) -> Any:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        payload = response.read().decode(charset)
    return json.loads(payload)


def normalize_openapi(document: Any) -> dict[str, Any]:
    if not isinstance(document, dict):
        raise TypeError("OpenAPI document root must be a JSON object")

    context = {"document": document}
    normalized: dict[str, Any] = {}
    if "openapi" in document:
        normalized["openapi"] = document["openapi"]

    if "security" in document:
        normalized["security"] = _normalize_value(document["security"], ("security",), context)

    normalized["paths"] = _normalize_paths(document.get("paths", {}), context)

    components = _normalize_components(document.get("components", {}), context)
    if components:
        normalized["components"] = components

    return normalized


def make_pointer(parts: tuple[str, ...]) -> str:
    if not parts:
        return ""
    return "/" + "/".join(part.replace("~", "~0").replace("/", "~1") for part in parts)


def collect_differences(
    baseline: Any,
    candidate: Any,
    path_parts: tuple[str, ...] = (),
) -> list[dict[str, Any]]:
    differences: list[dict[str, Any]] = []

    if type(baseline) is not type(candidate):
        differences.append(
            {
                "path": make_pointer(path_parts),
                "kind": "type_changed",
                "baseline": baseline,
                "candidate": candidate,
            }
        )
        return differences

    if isinstance(baseline, dict):
        baseline_keys = set(baseline.keys())
        candidate_keys = set(candidate.keys())
        for key in sorted(baseline_keys - candidate_keys):
            differences.append(
                {
                    "path": make_pointer(path_parts + (key,)),
                    "kind": "removed",
                    "baseline": baseline[key],
                    "candidate": None,
                }
            )
        for key in sorted(candidate_keys - baseline_keys):
            differences.append(
                {
                    "path": make_pointer(path_parts + (key,)),
                    "kind": "added",
                    "baseline": None,
                    "candidate": candidate[key],
                }
            )
        for key in sorted(baseline_keys & candidate_keys):
            differences.extend(
                collect_differences(baseline[key], candidate[key], path_parts + (key,))
            )
        return differences

    if isinstance(baseline, list):
        if len(baseline) != len(candidate):
            differences.append(
                {
                    "path": make_pointer(path_parts),
                    "kind": "list_length_changed",
                    "baseline": baseline,
                    "candidate": candidate,
                }
            )
            return differences

        for index, (baseline_item, candidate_item) in enumerate(zip(baseline, candidate)):
            differences.extend(
                collect_differences(
                    baseline_item,
                    candidate_item,
                    path_parts + (str(index),),
                )
            )
        return differences

    if baseline != candidate:
        differences.append(
            {
                "path": make_pointer(path_parts),
                "kind": "changed",
                "baseline": baseline,
                "candidate": candidate,
            }
        )
    return differences


def filter_approved_differences(
    differences: list[dict[str, Any]],
    approvals: dict[str, Any],
) -> list[dict[str, Any]]:
    approved_exact = set(approvals.get("approved_exact_paths", []))
    approved_prefixes = tuple(approvals.get("approved_prefix_paths", []))
    filtered: list[dict[str, Any]] = []
    for difference in differences:
        path = difference["path"]
        approved = path in approved_exact or any(path.startswith(prefix) for prefix in approved_prefixes)
        difference_with_flag = dict(difference)
        difference_with_flag["approved"] = approved
        filtered.append(difference_with_flag)
    return filtered


def _normalize_paths(paths: Any, context: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(paths, dict):
        raise TypeError("OpenAPI paths section must be an object")

    normalized_paths: dict[str, Any] = {}
    for path_name in sorted(paths.keys()):
        path_item = paths[path_name]
        if not isinstance(path_item, dict):
            raise TypeError(f"Path item for {path_name} must be an object")

        normalized_item: dict[str, Any] = {}
        if "parameters" in path_item:
            normalized_item["parameters"] = _normalize_value(
                path_item["parameters"],
                ("paths", path_name, "parameters"),
                context,
            )

        for method in HTTP_METHODS:
            if method in path_item:
                normalized_item[method] = _normalize_operation(
                    path_item[method],
                    ("paths", path_name, method),
                    context,
                )

        other_keys = sorted(
            key for key in path_item.keys() if key not in HTTP_METHODS and key != "parameters"
        )
        for key in other_keys:
            if _should_strip_key(("paths", path_name), key):
                continue
            normalized_item[key] = _normalize_value(
                path_item[key],
                ("paths", path_name, key),
                context,
            )

        normalized_paths[path_name] = normalized_item
    return normalized_paths


def _normalize_operation(
    operation: Any,
    path: tuple[str, ...],
    context: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(operation, dict):
        raise TypeError(f"Operation at {make_pointer(path)} must be an object")

    normalized: dict[str, Any] = {}
    for key in ("parameters", "requestBody", "responses", "security", "deprecated"):
        if key in operation:
            normalized[key] = _normalize_value(operation[key], path + (key,), context)
    return normalized


def _normalize_components(components: Any, context: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(components, dict):
        raise TypeError("OpenAPI components section must be an object")

    normalized: dict[str, Any] = {}
    if "securitySchemes" in components:
        normalized["securitySchemes"] = _normalize_value(
            components["securitySchemes"],
            ("components", "securitySchemes"),
            context,
        )
    return normalized


def _normalize_value(
    value: Any,
    path: tuple[str, ...],
    context: dict[str, Any],
    ref_stack: tuple[str, ...] = (),
    response_schema: bool = False,
) -> Any:
    if isinstance(value, dict):
        if response_schema:
            collapsed_nullable_union = _collapse_response_nullable_union(
                value,
                path,
                context,
                ref_stack,
            )
            if collapsed_nullable_union is not None:
                return collapsed_nullable_union
        else:
            canonical_nullable_union = _canonicalize_request_nullable_union(
                value,
                path,
                context,
                ref_stack,
            )
            if canonical_nullable_union is not None:
                return canonical_nullable_union

        if path and path[-1] == "additionalProperties" and not value:
            return True

        ref = value.get("$ref")
        if isinstance(ref, str) and (ref_stack or (path and path[0] == "paths")):
            return _normalize_ref_value(value, path, context, ref_stack, response_schema)

        if path and path[-1] == "responses":
            return _normalize_responses_dict(value, path, context, ref_stack, response_schema)

        if path and path[-1] == "content":
            return _normalize_content_dict(value, path, context, ref_stack, response_schema)

        normalized_dict: dict[str, Any] = {}
        for key in sorted(value.keys()):
            if _should_strip_key(path, key):
                continue
            if response_schema and key == "required" and _is_object_schema(value):
                continue
            normalized_dict[key] = _normalize_value(
                value[key],
                path + (key,),
                context,
                ref_stack,
                _enters_response_schema(path + (key,), response_schema),
            )
        return normalized_dict

    if isinstance(value, list):
        normalized_list = [
            _normalize_value(item, path, context, ref_stack, response_schema)
            for item in value
        ]

        key = path[-1] if path else ""
        if key == "type" and all(isinstance(item, str) for item in normalized_list):
            return sorted(normalized_list)
        if key in {"allOf", "anyOf", "enum", "oneOf", "required", "tags"}:
            return sorted(normalized_list, key=_stable_json_key)
        if key == "security":
            return sorted(normalized_list, key=_stable_json_key)
        if key == "parameters":
            return sorted(
                normalized_list,
                key=lambda item: (
                    item.get("in", "") if isinstance(item, dict) else "",
                    item.get("name", "") if isinstance(item, dict) else "",
                    _stable_json_key(item),
                ),
            )
        return normalized_list

    if isinstance(value, float) and _is_integral_numeric_constraint(path, value):
        return int(value)

    return value


def _normalize_ref_value(
    value: dict[str, Any],
    path: tuple[str, ...],
    context: dict[str, Any],
    ref_stack: tuple[str, ...],
    response_schema: bool,
) -> Any:
    ref = value.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/components/"):
        normalized_ref: dict[str, Any] = {}
        for key in sorted(value.keys()):
            if _should_strip_key(path, key):
                continue
            normalized_ref[key] = _normalize_value(
                value[key],
                path + (key,),
                context,
                ref_stack,
                _enters_response_schema(path + (key,), response_schema),
            )
        return normalized_ref

    sibling_keys = [
        key
        for key in sorted(value.keys())
        if key != "$ref" and not _should_strip_key(path, key)
    ]

    if ref in ref_stack:
        normalized_cycle = {"$ref": ref}
        for key in sibling_keys:
            normalized_cycle[key] = _normalize_value(
                value[key],
                path + (key,),
                context,
                ref_stack,
                _enters_response_schema(path + (key,), response_schema),
            )
        return normalized_cycle

    target = _resolve_local_ref(context["document"], ref)
    if target is None:
        normalized_missing = {"$ref": ref}
        for key in sibling_keys:
            normalized_missing[key] = _normalize_value(
                value[key],
                path + (key,),
                context,
                ref_stack,
                _enters_response_schema(path + (key,), response_schema),
            )
        return normalized_missing

    normalized_target = _normalize_value(
        target,
        _ref_to_path_parts(ref),
        context,
        ref_stack + (ref,),
        response_schema,
    )
    normalized_siblings = {
        key: _normalize_value(
            value[key],
            path + (key,),
            context,
            ref_stack,
            _enters_response_schema(path + (key,), response_schema),
        )
        for key in sibling_keys
    }

    if isinstance(normalized_target, dict):
        merged = dict(normalized_target)
        merged.update(normalized_siblings)
        return merged

    if normalized_siblings:
        return {"value": normalized_target, **normalized_siblings}
    return normalized_target


def _normalize_responses_dict(
    value: dict[str, Any],
    path: tuple[str, ...],
    context: dict[str, Any],
    ref_stack: tuple[str, ...],
    response_schema: bool,
) -> dict[str, Any]:
    normalized_dict: dict[str, Any] = {}
    for key in sorted(value.keys()):
        if key == "422" and _is_fastapi_validation_response(value[key], context):
            continue
        if _should_strip_key(path, key):
            continue
        normalized_dict[key] = _normalize_value(
            value[key],
            path + (key,),
            context,
            ref_stack,
            response_schema,
        )
    return normalized_dict


def _normalize_content_dict(
    value: dict[str, Any],
    path: tuple[str, ...],
    context: dict[str, Any],
    ref_stack: tuple[str, ...],
    response_schema: bool,
) -> dict[str, Any]:
    content_keys = sorted(value.keys())
    normalized_dict: dict[str, Any] = {}
    for key in content_keys:
        if _should_strip_key(path, key):
            continue
        normalized_key = "application/json" if content_keys == ["*/*"] and key == "*/*" else key
        normalized_dict[normalized_key] = _normalize_value(
            value[key],
            path + (key,),
            context,
            ref_stack,
            response_schema,
        )
    return normalized_dict


def _collapse_response_nullable_union(
    value: dict[str, Any],
    path: tuple[str, ...],
    context: dict[str, Any],
    ref_stack: tuple[str, ...],
) -> Any | None:
    for union_key in ("anyOf", "oneOf"):
        entries = value.get(union_key)
        if not isinstance(entries, list) or len(entries) != 2:
            continue

        concrete_entries = [entry for entry in entries if not _is_null_schema(entry, context)]
        null_entries = [entry for entry in entries if _is_null_schema(entry, context)]
        if len(concrete_entries) != 1 or len(null_entries) != 1:
            continue

        normalized_concrete = _normalize_value(
            concrete_entries[0],
            path + (union_key,),
            context,
            ref_stack,
            True,
        )
        normalized_siblings = {
            key: _normalize_value(value[key], path + (key,), context, ref_stack, True)
            for key in sorted(value.keys())
            if key != union_key
            and key != "required"
            and not _should_strip_key(path, key)
        }

        if isinstance(normalized_concrete, dict):
            merged = dict(normalized_concrete)
            merged.update(normalized_siblings)
            return merged

        if normalized_siblings:
            return {"value": normalized_concrete, **normalized_siblings}
        return normalized_concrete
    return None


def _canonicalize_request_nullable_union(
    value: dict[str, Any],
    path: tuple[str, ...],
    context: dict[str, Any],
    ref_stack: tuple[str, ...],
) -> dict[str, Any] | None:
    for union_key in ("anyOf", "oneOf"):
        entries = value.get(union_key)
        if not isinstance(entries, list) or len(entries) != 2:
            continue

        concrete_entries = [entry for entry in entries if not _is_null_schema(entry, context)]
        null_entries = [entry for entry in entries if _is_null_schema(entry, context)]
        if len(concrete_entries) != 1 or len(null_entries) != 1:
            continue

        normalized_concrete = _normalize_value(
            concrete_entries[0],
            path + (union_key,),
            context,
            ref_stack,
            False,
        )
        if not isinstance(normalized_concrete, dict):
            continue

        concrete_type = normalized_concrete.get("type")
        if isinstance(concrete_type, str):
            nullable_types = [concrete_type, "null"]
        elif isinstance(concrete_type, list) and all(
            isinstance(item, str) for item in concrete_type
        ):
            nullable_types = [*concrete_type, "null"]
        else:
            continue

        normalized = dict(normalized_concrete)
        normalized["type"] = sorted(set(nullable_types))
        for key in sorted(value.keys()):
            if key == union_key or _should_strip_key(path, key):
                continue
            normalized[key] = _normalize_value(
                value[key],
                path + (key,),
                context,
                ref_stack,
                False,
            )
        return normalized
    return None


def _is_integral_numeric_constraint(path: tuple[str, ...], value: float) -> bool:
    if not value.is_integer() or not path:
        return False
    return path[-1] in {
        "exclusiveMaximum",
        "exclusiveMinimum",
        "maximum",
        "maxItems",
        "maxLength",
        "maxProperties",
        "minimum",
        "minItems",
        "minLength",
        "minProperties",
        "multipleOf",
    }


def _is_fastapi_validation_response(value: Any, context: dict[str, Any]) -> bool:
    response_value = value
    ref = value.get("$ref") if isinstance(value, dict) else None
    if isinstance(ref, str):
        resolved = _resolve_local_ref(context["document"], ref)
        if resolved is None:
            return False
        response_value = resolved

    if not isinstance(response_value, dict):
        return False

    content = response_value.get("content")
    if not isinstance(content, dict):
        return False

    for media_type in ("application/json", "*/*"):
        media_value = content.get(media_type)
        if not isinstance(media_value, dict):
            continue
        if _is_http_validation_error_schema(media_value.get("schema"), context):
            return True
    return False


def _is_null_schema(value: Any, context: dict[str, Any]) -> bool:
    if not isinstance(value, dict):
        return False

    ref = value.get("$ref")
    if isinstance(ref, str):
        resolved = _resolve_local_ref(context["document"], ref)
        if resolved is None:
            return False
        return _is_null_schema(resolved, context)

    schema_type = value.get("type")
    if schema_type == "null":
        return True
    if isinstance(schema_type, list):
        return sorted(schema_type) == ["null"]
    return False


def _is_http_validation_error_schema(value: Any, context: dict[str, Any]) -> bool:
    if not isinstance(value, dict):
        return False

    ref = value.get("$ref")
    if isinstance(ref, str):
        if ref == "#/components/schemas/HTTPValidationError":
            return True
        resolved = _resolve_local_ref(context["document"], ref)
        if resolved is None:
            return False
        return _is_http_validation_error_schema(resolved, context)

    for key in ("allOf", "anyOf", "oneOf"):
        entries = value.get(key)
        if isinstance(entries, list) and any(
            _is_http_validation_error_schema(entry, context) for entry in entries
        ):
            return True
    return False


def _resolve_local_ref(document: dict[str, Any], ref: str) -> Any | None:
    if not ref.startswith("#/"):
        return None

    current: Any = document
    for part in _ref_to_path_parts(ref):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def _ref_to_path_parts(ref: str) -> tuple[str, ...]:
    if not ref.startswith("#/"):
        return ()
    return tuple(
        part.replace("~1", "/").replace("~0", "~")
        for part in ref[2:].split("/")
        if part
    )


def _should_strip_key(path: tuple[str, ...], key: str) -> bool:
    if key.startswith("x-"):
        return True
    if key in STRIP_KEYS:
        return True
    if path == ("components", "schemas") and key == "$schema":
        return True
    return False


def _enters_response_schema(path: tuple[str, ...], response_schema: bool) -> bool:
    if response_schema:
        return True
    return bool(path) and path[-1] == "schema" and "responses" in path


def _is_object_schema(value: dict[str, Any]) -> bool:
    schema_type = value.get("type")
    if schema_type == "object":
        return True
    if isinstance(schema_type, list) and "object" in schema_type:
        return True
    return "properties" in value or "additionalProperties" in value


def _stable_json_key(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def import_fastapi_openapi() -> dict[str, Any]:
    api_root = repo_root() / "apps" / "api"
    if str(api_root) not in sys.path:
        sys.path.insert(0, str(api_root))
    from app.main import create_app  # pylint: disable=import-outside-toplevel

    app = create_app()
    return app.openapi()
