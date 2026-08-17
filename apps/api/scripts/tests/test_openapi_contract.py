from __future__ import annotations

import sys
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

import _openapi_contract as oc


def make_security_schemes() -> dict[str, object]:
    return {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }


class OpenApiContractNormalizationTest(unittest.TestCase):
    def test_resolves_path_component_refs_semantically_and_drops_schema_name_churn(self) -> None:
        baseline = {
            "openapi": "3.1.0",
            "security": [{"bearerAuth": []}],
            "paths": {
                "/items": {
                    "post": {
                        "security": [{"bearerAuth": []}],
                        "requestBody": {
                            "$ref": "#/components/requestBodies/CreateItemRequestBody"
                        },
                        "responses": {
                            "200": {"$ref": "#/components/responses/ItemResponse"}
                        },
                    }
                }
            },
            "components": {
                "securitySchemes": make_security_schemes(),
                "requestBodies": {
                    "CreateItemRequestBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CreateItemPayload"}
                            }
                        }
                    }
                },
                "responses": {
                    "ItemResponse": {
                        "description": "created",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ItemPayload"}
                            }
                        },
                    }
                },
                "schemas": {
                    "CreateItemPayload": {
                        "type": "object",
                        "required": ["status", "id", "kind", "meta"],
                        "properties": {
                            "id": {"type": "string", "format": "uuid"},
                            "kind": {
                                "anyOf": [{"type": "string"}, {"type": "null"}]
                            },
                            "meta": {"$ref": "#/components/schemas/MetaPayload"},
                            "status": {"enum": ["live", "draft"]},
                        },
                    },
                    "MetaPayload": {
                        "type": "object",
                        "properties": {
                            "createdAt": {
                                "type": "string",
                                "format": "date-time",
                            }
                        },
                    },
                    "ItemPayload": {
                        "type": "object",
                        "required": ["createdAt", "id"],
                        "properties": {
                            "createdAt": {
                                "type": "string",
                                "format": "date-time",
                            },
                            "id": {"type": "string", "format": "uuid"},
                        },
                    },
                },
            },
        }
        candidate = {
            "openapi": "3.1.0",
            "security": [{"bearerAuth": []}],
            "paths": {
                "/items": {
                    "post": {
                        "security": [{"bearerAuth": []}],
                        "requestBody": {
                            "$ref": "#/components/requestBodies/NewInterviewBody"
                        },
                        "responses": {
                            "200": {"$ref": "#/components/responses/CreatedInterviewResponse"}
                        },
                    }
                }
            },
            "components": {
                "securitySchemes": make_security_schemes(),
                "requestBodies": {
                    "NewInterviewBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/NewInterviewPayload"}
                            }
                        }
                    }
                },
                "responses": {
                    "CreatedInterviewResponse": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/NewInterviewResult"}
                            }
                        }
                    }
                },
                "schemas": {
                    "NewInterviewPayload": {
                        "type": "object",
                        "required": ["meta", "kind", "id", "status"],
                        "properties": {
                            "id": {"type": "string", "format": "uuid"},
                            "kind": {
                                "anyOf": [{"type": "string"}, {"type": "null"}]
                            },
                            "meta": {"$ref": "#/components/schemas/NewInterviewMeta"},
                            "status": {"enum": ["draft", "live"]},
                        },
                    },
                    "NewInterviewMeta": {
                        "type": "object",
                        "properties": {
                            "createdAt": {
                                "type": "string",
                                "format": "date-time",
                            }
                        },
                    },
                    "NewInterviewResult": {
                        "type": "object",
                        "required": ["id", "createdAt"],
                        "properties": {
                            "createdAt": {
                                "type": "string",
                                "format": "date-time",
                            },
                            "id": {"type": "string", "format": "uuid"},
                        },
                    },
                },
            },
        }

        normalized_baseline = oc.normalize_openapi(baseline)
        normalized_candidate = oc.normalize_openapi(candidate)

        self.assertEqual(normalized_baseline, normalized_candidate)
        self.assertEqual(
            normalized_baseline["components"],
            {"securitySchemes": make_security_schemes()},
        )
        request_schema = normalized_baseline["paths"]["/items"]["post"]["requestBody"]["content"][
            "application/json"
        ]["schema"]
        self.assertEqual(request_schema["required"], ["id", "kind", "meta", "status"])
        self.assertEqual(request_schema["properties"]["status"]["enum"], ["draft", "live"])
        self.assertEqual(
            request_schema["properties"]["kind"]["type"],
            ["null", "string"],
        )
        self.assertEqual(
            request_schema["properties"]["meta"]["properties"]["createdAt"]["format"],
            "date-time",
        )

    def test_normalizes_sole_wildcard_content_to_application_json(self) -> None:
        document = {
            "openapi": "3.1.0",
            "paths": {
                "/places": {
                    "get": {
                        "responses": {
                            "200": {
                                "content": {
                                    "*/*": {
                                        "schema": {"type": "object", "properties": {"ok": {"type": "boolean"}}}
                                    }
                                }
                            }
                        }
                    }
                }
            },
        }

        normalized = oc.normalize_openapi(document)
        self.assertEqual(
            sorted(normalized["paths"]["/places"]["get"]["responses"]["200"]["content"].keys()),
            ["application/json"],
        )

    def test_strips_framework_generated_http_validation_422_responses(self) -> None:
        document = {
            "openapi": "3.1.0",
            "paths": {
                "/places": {
                    "get": {
                        "responses": {
                            "200": {"content": {"application/json": {"schema": {"type": "object"}}}},
                            "422": {"$ref": "#/components/responses/ValidationErrorResponse"},
                        }
                    }
                }
            },
            "components": {
                "responses": {
                    "ValidationErrorResponse": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/HTTPValidationError"}
                            }
                        }
                    }
                },
                "schemas": {
                    "HTTPValidationError": {
                        "type": "object",
                        "properties": {"detail": {"type": "array"}},
                    }
                },
            },
        }

        normalized = oc.normalize_openapi(document)
        self.assertEqual(
            sorted(normalized["paths"]["/places"]["get"]["responses"].keys()),
            ["200"],
        )

    def test_preserves_non_http_validation_422_responses(self) -> None:
        document = {
            "openapi": "3.1.0",
            "paths": {
                "/auth": {
                    "post": {
                        "responses": {
                            "422": {
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/DomainError"}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "DomainError": {
                        "type": "object",
                        "required": ["code"],
                        "properties": {"code": {"enum": ["invalid_phone"]}},
                    }
                }
            },
        }

        normalized = oc.normalize_openapi(document)
        self.assertIn("422", normalized["paths"]["/auth"]["post"]["responses"])

    def test_treats_integral_bounds_and_additional_properties_as_equal(self) -> None:
        baseline = {
            "openapi": "3.1.0",
            "paths": {
                "/filters": {
                    "post": {
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": {},
                                        "properties": {
                                            "radiusKm": {
                                                "type": "number",
                                                "minimum": 0.0,
                                                "maximum": 240.0,
                                            }
                                        },
                                    }
                                }
                            }
                        },
                        "responses": {"200": {"content": {"application/json": {"schema": {"type": "object"}}}}},
                    }
                }
            },
        }
        candidate = {
            "openapi": "3.1.0",
            "paths": {
                "/filters": {
                    "post": {
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": True,
                                        "properties": {
                                            "radiusKm": {
                                                "type": "number",
                                                "minimum": 0,
                                                "maximum": 240,
                                            }
                                        },
                                    }
                                }
                            }
                        },
                        "responses": {"200": {"content": {"application/json": {"schema": {"type": "object"}}}}},
                    }
                }
            },
        }

        differences = oc.collect_differences(
            oc.normalize_openapi(baseline),
            oc.normalize_openapi(candidate),
        )
        self.assertEqual(differences, [])

    def test_keeps_request_required_and_nullable_differences_strict(self) -> None:
        baseline = {
            "openapi": "3.1.0",
            "paths": {
                "/auth": {
                    "post": {
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "required": ["provider"],
                                        "properties": {
                                            "provider": {"type": "string"},
                                            "nickname": {"type": "string"},
                                        },
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {"type": "object", "properties": {"ok": {"type": "boolean"}}}
                                    }
                                }
                            }
                        },
                    }
                }
            },
        }
        candidate = {
            "openapi": "3.1.0",
            "paths": {
                "/auth": {
                    "post": {
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "provider": {
                                                "anyOf": [{"type": "string"}, {"type": "null"}]
                                            },
                                            "nickname": {"type": "string"},
                                        },
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {"type": "object", "properties": {"ok": {"type": "boolean"}}}
                                    }
                                }
                            }
                        },
                    }
                }
            },
        }

        differences = oc.collect_differences(
            oc.normalize_openapi(baseline),
            oc.normalize_openapi(candidate),
        )

        self.assertTrue(
            any(
                difference["path"]
                == "/paths/~1auth/post/requestBody/content/application~1json/schema/required"
                for difference in differences
            )
        )
        self.assertTrue(
            any(
                difference["path"].startswith(
                    "/paths/~1auth/post/requestBody/content/application~1json/schema/properties/provider/type"
                )
                for difference in differences
            )
        )

    def test_normalizes_equivalent_request_nullable_union_representations(self) -> None:
        baseline = {
            "openapi": "3.1.0",
            "paths": {
                "/items": {
                    "patch": {
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "count": {
                                                "anyOf": [
                                                    {
                                                        "type": "integer",
                                                        "minimum": 0,
                                                        "maximum": 10,
                                                    },
                                                    {"type": "null"},
                                                ]
                                            }
                                        },
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {"type": "object"}
                                    }
                                }
                            }
                        },
                    }
                }
            },
        }
        candidate = {
            "openapi": "3.1.0",
            "paths": {
                "/items": {
                    "patch": {
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "count": {
                                                "type": ["null", "integer"],
                                                "minimum": 0,
                                                "maximum": 10,
                                            }
                                        },
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {"type": "object"}
                                    }
                                }
                            }
                        },
                    }
                }
            },
        }

        differences = oc.collect_differences(
            oc.normalize_openapi(baseline),
            oc.normalize_openapi(candidate),
        )

        self.assertEqual(differences, [])

    def test_normalizes_response_required_and_nullable_generator_noise(self) -> None:
        baseline = {
            "openapi": "3.1.0",
            "paths": {
                "/me": {
                    "get": {
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "required": ["id", "profile"],
                                            "properties": {
                                                "id": {"type": "string", "format": "uuid"},
                                                "profile": {
                                                    "type": "object",
                                                    "required": ["nickname"],
                                                    "properties": {
                                                        "nickname": {"type": "string"},
                                                        "bio": {
                                                            "anyOf": [
                                                                {"type": "string"},
                                                                {"type": "null"},
                                                            ]
                                                        },
                                                    },
                                                },
                                            },
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        }
        candidate = {
            "openapi": "3.1.0",
            "paths": {
                "/me": {
                    "get": {
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "id": {"type": "string", "format": "uuid"},
                                                "profile": {
                                                    "type": "object",
                                                    "properties": {
                                                        "nickname": {"type": "string"},
                                                        "bio": {"type": "string"},
                                                    },
                                                },
                                            },
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        }

        differences = oc.collect_differences(
            oc.normalize_openapi(baseline),
            oc.normalize_openapi(candidate),
        )

        self.assertEqual(differences, [])

    def test_preserves_genuine_response_field_and_type_differences(self) -> None:
        baseline = {
            "openapi": "3.1.0",
            "paths": {
                "/notifications": {
                    "get": {
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "items": {
                                                    "type": "array",
                                                    "items": {
                                                        "type": "object",
                                                        "properties": {
                                                            "id": {"type": "string"},
                                                            "sentAt": {
                                                                "type": "string",
                                                                "format": "date-time",
                                                            },
                                                        },
                                                    },
                                                }
                                            },
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        }
        candidate = {
            "openapi": "3.1.0",
            "paths": {
                "/notifications": {
                    "get": {
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "items": {
                                                    "type": "array",
                                                    "items": {
                                                        "type": "object",
                                                        "properties": {
                                                            "id": {"type": "integer"},
                                                            "deliveredAt": {
                                                                "type": "string",
                                                                "format": "date-time",
                                                            },
                                                        },
                                                    },
                                                }
                                            },
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        }

        differences = oc.collect_differences(
            oc.normalize_openapi(baseline),
            oc.normalize_openapi(candidate),
        )

        self.assertTrue(
            any(
                difference["path"]
                == "/paths/~1notifications/get/responses/200/content/application~1json/schema/properties/items/items/properties/id/type"
                for difference in differences
            )
        )
        self.assertTrue(
            any(
                difference["path"]
                == "/paths/~1notifications/get/responses/200/content/application~1json/schema/properties/items/items/properties/deliveredAt"
                and difference["kind"] == "added"
                for difference in differences
            )
        )
        self.assertTrue(
            any(
                difference["path"]
                == "/paths/~1notifications/get/responses/200/content/application~1json/schema/properties/items/items/properties/sentAt"
                and difference["kind"] == "removed"
                for difference in differences
            )
        )

    def test_handles_recursive_component_cycles_without_infinite_expansion(self) -> None:
        document = {
            "openapi": "3.1.0",
            "paths": {
                "/tree": {
                    "get": {
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/Node"}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "Node": {
                        "type": "object",
                        "properties": {
                            "child": {"$ref": "#/components/schemas/Branch"}
                        },
                    },
                    "Branch": {
                        "type": "object",
                        "properties": {
                            "root": {"$ref": "#/components/schemas/Node"}
                        },
                    },
                }
            },
        }

        normalized = oc.normalize_openapi(document)
        schema = normalized["paths"]["/tree"]["get"]["responses"]["200"]["content"][
            "application/json"
        ]["schema"]
        self.assertEqual(
            schema["properties"]["child"]["properties"]["root"],
            {"$ref": "#/components/schemas/Node"},
        )

    def test_preserves_missing_local_refs_as_meaningful_differences(self) -> None:
        document = {
            "openapi": "3.1.0",
            "paths": {
                "/missing": {
                    "get": {
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/DoesNotExist"}
                                    }
                                }
                            }
                        }
                    }
                }
            },
        }

        normalized = oc.normalize_openapi(document)
        self.assertEqual(
            normalized["paths"]["/missing"]["get"]["responses"]["200"]["content"][
                "application/json"
            ]["schema"],
            {"$ref": "#/components/schemas/DoesNotExist"},
        )


if __name__ == "__main__":
    unittest.main()
