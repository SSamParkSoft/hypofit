package com.contentruck.hypofit.common.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class RawRequestBodyJson {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private RawRequestBodyJson() {
    }

    public static JsonNode toJsonNode(Object rawBody) {
        return OBJECT_MAPPER.valueToTree(rawBody);
    }
}
