package com.contentruck.hypofit.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.media.Schema;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class OpenApiContractCustomizer {

    @Bean
    OpenApiCustomizer highValueOpenApiContractCustomizer() {
        return openApi -> {
            patchChatRequestContracts(openApi);
            patchChatRoomResponseContracts(openApi);
            patchInterviewResponseContracts(openApi);
            patchAdminResponseContracts(openApi);
            patchPlaceResponseContracts(openApi);
            patchRemainingParameterContracts(openApi);
            patchApplicationRequestContracts(openApi);
            patchNullableChatReadRequestBody(openApi);
            patchInterviewRequestContracts(openApi);
            patchAccountDeletionContracts(openApi);
            patchSessionContracts(openApi);
            patchAppleSignInNotificationAcceptedSchema(openApi);
        };
    }

    private void patchChatRequestContracts(OpenAPI openApi) {
        patchChatMessageCreateSchema(openApi);
        patchChatReadRequestSchema(openApi);
        patchChatSettingsUpdateSchema(openApi);
        patchChatMessageListParameterSchemas(openApi);
    }

    private void patchNullableChatReadRequestBody(OpenAPI openApi) {
        if (openApi.getPaths() == null) {
            return;
        }
        var pathItem = openApi.getPaths().get("/api/v1/chat/rooms/{room_id}/read");
        if (pathItem == null || pathItem.getPost() == null || pathItem.getPost().getRequestBody() == null) {
            return;
        }
        var content = pathItem.getPost().getRequestBody().getContent();
        if (content == null || content.get("application/json") == null) {
            return;
        }
        Schema<Object> refSchema = new Schema<>();
        refSchema.set$ref("#/components/schemas/ChatRoomReadUpdate");

        Schema<Object> nullSchema = new Schema<>();
        nullSchema.addType("null");

        Schema<Object> nullableSchema = new Schema<>();
        nullableSchema.setAnyOf(List.of(refSchema, nullSchema));
        content.get("application/json").setSchema(nullableSchema);
    }

    private void patchChatRoomResponseContracts(OpenAPI openApi) {
        patchChatRoomResponseSchema(openApi);
        patchChatInterviewPostResponseSchema(openApi);
        patchChatFounderReviewSummaryResponseSchema(openApi);
    }

    private void patchChatRoomResponseSchema(OpenAPI openApi) {
        patchSchemaProperty(openApi, "ChatRoomResponse", "unread_count", schema -> schema.setFormat(null));
    }

    private void patchChatInterviewPostResponseSchema(OpenAPI openApi) {
        patchSchemaProperty(openApi, "ChatInterviewPostResponse", "reward_amount", schema -> schema.setFormat(null));
        patchSchemaProperty(openApi, "ChatInterviewPostResponse", "duration_minutes", schema -> schema.setFormat(null));
        patchSchemaProperty(openApi, "ChatInterviewPostResponse", "recruit_count", schema -> schema.setFormat(null));
        patchSchemaProperty(openApi, "ChatInterviewPostResponse", "location_latitude", schema -> schema.setFormat(null));
        patchSchemaProperty(openApi, "ChatInterviewPostResponse", "location_longitude", schema -> schema.setFormat(null));
        patchSchemaProperty(openApi, "ChatInterviewPostResponse", "distance_meters", schema -> schema.setFormat(null));
    }

    private void patchChatFounderReviewSummaryResponseSchema(OpenAPI openApi) {
        patchSchemaProperty(openApi, "ChatFounderReviewSummaryResponse", "average_rating", schema -> schema.setFormat(null));
        patchSchemaProperty(openApi, "ChatFounderReviewSummaryResponse", "review_count", schema -> schema.setFormat(null));
    }

    private void patchInterviewResponseContracts(OpenAPI openApi) {
        clearSchemaPropertyFormat(openApi, "InterviewPostResponse", "reward_amount");
        clearSchemaPropertyFormat(openApi, "InterviewPostResponse", "duration_minutes");
        clearSchemaPropertyFormat(openApi, "InterviewPostResponse", "recruit_count");
        clearSchemaPropertyFormat(openApi, "InterviewPostResponse", "location_latitude");
        clearSchemaPropertyFormat(openApi, "InterviewPostResponse", "location_longitude");
        clearSchemaPropertyFormat(openApi, "InterviewPostResponse", "distance_meters");
        clearSchemaPropertyFormat(openApi, "FounderReviewSummaryResponse", "average_rating");
        clearSchemaPropertyFormat(openApi, "FounderReviewSummaryResponse", "review_count");
        clearSchemaPropertyFormat(openApi, "InterviewPostViewResponse", "view_count");
    }

    private void patchAdminResponseContracts(OpenAPI openApi) {
        for (String property : List.of("open", "in_review", "reports_open", "account_deletion_open")) {
            clearSchemaPropertyFormat(openApi, "AdminSupportSummaryResponse", property);
        }
        for (String property : List.of("processed", "sent", "failed", "invalid", "skipped")) {
            clearSchemaPropertyFormat(openApi, "PushDispatchResultResponse", property);
        }
    }

    private void patchPlaceResponseContracts(OpenAPI openApi) {
        clearSchemaPropertyFormat(openApi, "PlaceSearchResponse", "latitude");
        clearSchemaPropertyFormat(openApi, "PlaceSearchResponse", "longitude");
    }

    private void patchApplicationRequestContracts(OpenAPI openApi) {
        if (openApi.getPaths() == null) {
            return;
        }
        var pathItem = openApi.getPaths().get("/api/v1/applications/{application_id}/status");
        if (pathItem == null || pathItem.getPatch() == null || pathItem.getPatch().getRequestBody() == null) {
            return;
        }
        var content = pathItem.getPatch().getRequestBody().getContent();
        if (content == null || content.get("application/json") == null) {
            return;
        }
        Schema<?> requestSchema = content.get("application/json").getSchema();
        if (requestSchema == null || requestSchema.getProperties() == null) {
            return;
        }

        requestSchema.setRequired(List.of("status"));

        Schema<Object> statusSchema = stringSchema(false, null, null, null);
        statusSchema.setEnum(List.of("canceled", "rejected", "selected"));
        requestSchema.getProperties().put("status", statusSchema);
        requestSchema.getProperties().put(
                "rejection_reason",
                stringSchema(true, null, 2, 500)
        );
    }

    private void patchRemainingParameterContracts(OpenAPI openApi) {
        if (openApi.getPaths() == null) {
            return;
        }
        var adminSupport = openApi.getPaths().get("/api/v1/admin/support/tickets");
        if (adminSupport != null) {
            patchParameterSchema(adminSupport.getGet(), "deleted_by_user", booleanSchema(true));
            Schema<Object> kindSchema = stringSchema(true, null, null, null);
            kindSchema.setPattern("^(inquiry|report|privacy|account_deletion)$");
            patchParameterSchema(adminSupport.getGet(), "kind", kindSchema);
            Schema<Object> statusSchema = stringSchema(true, null, null, null);
            statusSchema.setPattern("^(open|in_review|resolved|closed)$");
            patchParameterSchema(adminSupport.getGet(), "status", statusSchema);
        }

        var adminTarget = openApi.getPaths().get("/api/v1/admin/targets/{target_type}/{target_id}");
        if (adminTarget != null) {
            Schema<Object> targetTypeSchema = stringSchema(false, null, null, null);
            targetTypeSchema.setEnum(List.of(
                    "application", "chat_message", "chat_room", "interview_post", "session", "user"
            ));
            patchParameterSchema(adminTarget.getGet(), "target_type", targetTypeSchema);
        }

        var placeSearch = openApi.getPaths().get("/api/v1/places/search");
        if (placeSearch != null) {
            patchParameterSchema(
                    placeSearch.getGet(),
                    "lat",
                    numericSchema("number", true, "-90", "90", null)
            );
            patchParameterSchema(
                    placeSearch.getGet(),
                    "lng",
                    numericSchema("number", true, "-180", "180", null)
            );
            patchParameterSchema(
                    placeSearch.getGet(),
                    "radius_m",
                    numericSchema("integer", true, "0", "20000", null)
            );
            patchParameterSchema(
                    placeSearch.getGet(),
                    "limit",
                    numericSchema("integer", false, "1", "15", 10)
            );
        }

        var supportTickets = openApi.getPaths().get("/api/v1/support/tickets");
        if (supportTickets != null) {
            Schema<Object> kindSchema = stringSchema(true, null, null, null);
            kindSchema.setPattern("^(inquiry|report|privacy|account_deletion)$");
            patchParameterSchema(supportTickets.getGet(), "kind", kindSchema);
        }
    }

    private void patchChatMessageCreateSchema(OpenAPI openApi) {
        replaceSchemaProperty(
                openApi,
                "ChatMessageCreateRequest",
                "body",
                stringSchema(false, null, 1, 2000)
        );
        replaceSchemaProperty(
                openApi,
                "ChatMessageCreateRequest",
                "client_message_id",
                stringSchema(true, null, null, 80)
        );
    }

    private void patchChatReadRequestSchema(OpenAPI openApi) {
        replaceSchemaProperty(
                openApi,
                "ChatRoomReadUpdate",
                "last_read_message_id",
                stringSchema(true, "uuid", null, null)
        );
    }

    private void patchChatSettingsUpdateSchema(OpenAPI openApi) {
        replaceSchemaProperty(
                openApi,
                "ChatRoomSettingsUpdateRequest",
                "is_hidden",
                booleanSchema(true)
        );
        replaceSchemaProperty(
                openApi,
                "ChatRoomSettingsUpdateRequest",
                "is_muted",
                booleanSchema(true)
        );
    }

    private void patchChatMessageListParameterSchemas(OpenAPI openApi) {
        if (openApi.getPaths() == null) {
            return;
        }
        var pathItem = openApi.getPaths().get("/api/v1/chat/rooms/{room_id}/messages");
        if (pathItem == null || pathItem.getGet() == null) {
            return;
        }
        patchParameterSchema(pathItem.getGet(), "before", stringSchema(true, "date-time", null, null));
        patchParameterSchema(pathItem.getGet(), "before_id", stringSchema(true, "uuid", null, null));
        patchChatMessageListLimitParameter(pathItem.getGet());
    }

    private void patchChatMessageListLimitParameter(Operation operation) {
        patchInterviewPostListParameterSchema(operation, "limit", schema -> {
            schema.setType("integer");
            schema.setMinimum(java.math.BigDecimal.ONE);
            schema.setMaximum(new java.math.BigDecimal("100"));
            schema.setDefault(50);
            schema.setFormat(null);
        });
    }

    private void patchInterviewRequestContracts(OpenAPI openApi) {
        patchInterviewPostWriteSchemas(openApi);
        patchInterviewPostStatusUpdateSchema(openApi);
        patchInterviewPostListParameterSchemas(openApi);
    }

    private void patchInterviewPostWriteSchemas(OpenAPI openApi) {
        for (String schemaName : List.of("InterviewPostCreate", "InterviewPostUpdate")) {
            clearSchemaPropertyFormat(openApi, schemaName, "reward_amount");
            clearSchemaPropertyFormat(openApi, schemaName, "duration_minutes");
            clearSchemaPropertyFormat(openApi, schemaName, "recruit_count");
            clearSchemaPropertyFormat(openApi, schemaName, "location_latitude");
            clearSchemaPropertyFormat(openApi, schemaName, "location_longitude");
        }
        patchSchemaProperty(openApi, "InterviewPostUpdate", "schedule_options", schema -> {
            schema.setType(null);
            schema.addType("array");
            schema.addType("null");
        });
    }

    private void patchAccountDeletionContracts(OpenAPI openApi) {
        patchAccountDeletionConfirmSchema(openApi);
        patchAccountDeletionResponseEnums(openApi);
    }

    private void patchSessionContracts(OpenAPI openApi) {
        patchSessionRequestContracts(openApi);
        patchSessionSchemaFormats(openApi);
    }

    private void patchInterviewPostStatusUpdateSchema(OpenAPI openApi) {
        if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
            return;
        }
        Schema<?> requestSchema = openApi.getComponents().getSchemas().get("InterviewPostStatusUpdate");
        if (requestSchema == null || requestSchema.getProperties() == null) {
            return;
        }
        Object statusProperty = requestSchema.getProperties().get("status");
        if (!(statusProperty instanceof Schema<?> statusSchema)) {
            return;
        }
        statusSchema.setEnum(null);
        statusSchema.setConst("closed");
    }

    private void patchInterviewPostListParameterSchemas(OpenAPI openApi) {
        if (openApi.getPaths() == null) {
            return;
        }
        var pathItem = openApi.getPaths().get("/api/v1/interview-posts/");
        if (pathItem == null) {
            return;
        }
        patchInterviewPostListParameterSchema(pathItem.getGet(), "q", schema -> schema.setMaxLength(100));
        patchInterviewPostListParameterSchema(pathItem.getGet(), "reward_min", schema -> schema.setMinimum(java.math.BigDecimal.ZERO));
        patchInterviewPostListParameterSchema(pathItem.getGet(), "reward_max", schema -> schema.setMinimum(java.math.BigDecimal.ZERO));
        patchInterviewPostListParameterSchema(pathItem.getGet(), "lat", schema -> {
            schema.setMinimum(new java.math.BigDecimal("-90"));
            schema.setMaximum(new java.math.BigDecimal("90"));
        });
        patchInterviewPostListParameterSchema(pathItem.getGet(), "lng", schema -> {
            schema.setMinimum(new java.math.BigDecimal("-180"));
            schema.setMaximum(new java.math.BigDecimal("180"));
        });
        patchInterviewPostListParameterSchema(pathItem.getGet(), "radius_m", schema -> {
            schema.setMinimum(new java.math.BigDecimal("500"));
            schema.setMaximum(new java.math.BigDecimal("20000"));
        });
        patchInterviewPostListParameterSchema(pathItem.getGet(), "sort", schema -> schema.setPattern("^(newest|distance|reward)$"));
        patchInterviewPostListParameterSchema(pathItem.getGet(), "limit", schema -> {
            schema.setMinimum(java.math.BigDecimal.ONE);
            schema.setMaximum(new java.math.BigDecimal("100"));
        });
        patchNullableParameter(pathItem.getGet(), "founder_id", "string", false);
        patchNullableParameter(pathItem.getGet(), "lat", "number", true);
        patchNullableParameter(pathItem.getGet(), "lng", "number", true);
        patchNullableParameter(pathItem.getGet(), "mode", "string", false);
        patchNullableParameter(pathItem.getGet(), "q", "string", false);
        patchNullableParameter(pathItem.getGet(), "radius_m", "integer", true);
        patchNullableParameter(pathItem.getGet(), "reward_max", "integer", true);
        patchNullableParameter(pathItem.getGet(), "reward_min", "integer", true);
        patchNullableParameter(pathItem.getGet(), "status", "string", false);
        patchInterviewPostListParameterSchema(pathItem.getGet(), "limit", schema -> schema.setFormat(null));
    }

    private void patchNullableParameter(
            Operation operation,
            String parameterName,
            String concreteType,
            boolean clearFormat
    ) {
        patchInterviewPostListParameterSchema(operation, parameterName, schema -> {
            schema.setType(null);
            schema.addType(concreteType);
            schema.addType("null");
            if (clearFormat) {
                schema.setFormat(null);
            }
        });
    }

    private void patchAccountDeletionConfirmSchema(OpenAPI openApi) {
        if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
            return;
        }
        Schema<?> confirmRequest = openApi.getComponents().getSchemas().get("ConfirmRequest");
        if (confirmRequest == null || confirmRequest.getProperties() == null) {
            return;
        }
        Object confirmProperty = confirmRequest.getProperties().get("confirm");
        if (confirmProperty instanceof Schema<?> confirmSchema) {
            confirmSchema.setEnum(null);
            confirmSchema.setConst(true);
        }
    }

    private void patchAccountDeletionResponseEnums(OpenAPI openApi) {
        if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
            return;
        }
        patchEnumProperty(
                openApi,
                "AccountDeletionRequestResponse",
                "status",
                List.of("requested", "verified", "in_review", "completed", "rejected", "canceled")
        );
        patchEnumProperty(
                openApi,
                "PublicAccountDeletionRequestResponse",
                "status",
                List.of("requested", "verified", "in_review", "completed", "rejected", "canceled")
        );
        patchEnumProperty(
                openApi,
                "AdminAccountDeletionRequestResponse",
                "status",
                List.of("requested", "verified", "in_review", "completed", "rejected", "canceled")
        );
        patchEnumProperty(
                openApi,
                "AdminAccountDeletionRequestResponse",
                "verification_status",
                List.of("not_required", "awaiting_verification", "verified", "closed_without_verification")
        );
    }

    private void patchEnumProperty(OpenAPI openApi, String schemaName, String propertyName, List<String> values) {
        Schema<?> schema = openApi.getComponents().getSchemas().get(schemaName);
        if (schema == null || schema.getProperties() == null) {
            return;
        }
        Object property = schema.getProperties().get(propertyName);
        if (property instanceof Schema<?> propertySchema) {
            @SuppressWarnings("unchecked")
            Schema<Object> typedSchema = (Schema<Object>) propertySchema;
            typedSchema.setEnum(List.copyOf(values));
        }
    }

    private void patchAppleSignInNotificationAcceptedSchema(OpenAPI openApi) {
        if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
            return;
        }
        Schema<?> schema = openApi.getComponents().getSchemas().get("AppleSignInNotificationAccepted");
        if (schema == null || schema.getProperties() == null) {
            return;
        }
        Object statusProperty = schema.getProperties().get("status");
        if (statusProperty instanceof Schema<?> propertySchema) {
            @SuppressWarnings("unchecked")
            Schema<Object> typedSchema = (Schema<Object>) propertySchema;
            typedSchema.setDefault("accepted");
            typedSchema.setConst("accepted");
        }
    }

    private void patchSessionRequestContracts(OpenAPI openApi) {
        patchEnumProperty(openApi, "CreateSessionRequest", "meeting_type", List.of("offline", "online"));
        clearSchemaPropertyPattern(openApi, "CreateSessionRequest", "meeting_type");
        clearSchemaPropertyMinLength(openApi, "CreateSessionRequest", "meeting_type");
        clearSchemaPropertyMinLength(openApi, "CreateSessionRequest", "meeting_url");
        clearSchemaPropertyMaxLength(openApi, "CreateSessionRequest", "meeting_url");
        clearSchemaPropertyMinLength(openApi, "CreateSessionRequest", "place");
        clearSchemaPropertyMaxLength(openApi, "CreateSessionRequest", "place");

        patchEnumProperty(openApi, "UpdateSessionRequest", "meeting_type", List.of("offline", "online"));
        clearSchemaPropertyPattern(openApi, "UpdateSessionRequest", "meeting_type");
        clearSchemaPropertyMinLength(openApi, "UpdateSessionRequest", "meeting_type");
        clearSchemaPropertyMaxLength(openApi, "UpdateSessionRequest", "meeting_type");
        clearSchemaPropertyMinLength(openApi, "UpdateSessionRequest", "meeting_url");
        clearSchemaPropertyMinLength(openApi, "UpdateSessionRequest", "place");
        clearSchemaPropertyMinLength(openApi, "UpdateSessionRequest", "reason");

        patchEnumProperty(openApi, "NoShowRequest", "no_show_party", List.of("founder", "respondent"));
        clearSchemaPropertyPattern(openApi, "NoShowRequest", "no_show_party");

        clearSchemaPropertyMinLength(openApi, "CancelSessionRequest", "reason");
        clearSchemaPropertyMinLength(openApi, "RewardDisputeRequest", "reason");
        clearSchemaPropertyMinLength(openApi, "ReviewCreateRequest", "comment");
        clearSchemaPropertyMinItems(openApi, "ReviewCreateRequest", "tags");
    }

    private void patchSessionSchemaFormats(OpenAPI openApi) {
        clearSchemaPropertyFormat(openApi, "ReviewCreateRequest", "rating");
        clearSchemaPropertyFormat(openApi, "InterviewReviewResponse", "rating");
        clearSchemaPropertyFormat(openApi, "RewardConfirmationResponse", "amount");
        clearSchemaPropertyFormat(openApi, "ChatWorkflowReviewResponse", "rating");
        clearSchemaPropertyFormat(openApi, "ChatWorkflowRewardResponse", "amount");
    }

    private void patchInterviewPostListParameterSchema(
            Operation operation,
            String parameterName,
            java.util.function.Consumer<Schema<?>> patch
    ) {
        if (operation == null || operation.getParameters() == null) {
            return;
        }
        for (Parameter parameter : operation.getParameters()) {
            if (!parameterName.equals(parameter.getName()) || parameter.getSchema() == null) {
                continue;
            }
            patch.accept(parameter.getSchema());
            return;
        }
    }

    private void patchParameterSchema(
            Operation operation,
            String parameterName,
            Schema<Object> replacement
    ) {
        if (operation == null || operation.getParameters() == null) {
            return;
        }
        for (Parameter parameter : operation.getParameters()) {
            if (!parameterName.equals(parameter.getName())) {
                continue;
            }
            parameter.setSchema(replacement);
            return;
        }
    }

    private void clearSchemaPropertyPattern(OpenAPI openApi, String schemaName, String propertyName) {
        patchSchemaProperty(openApi, schemaName, propertyName, schema -> schema.setPattern(null));
    }

    private void clearSchemaPropertyMinLength(OpenAPI openApi, String schemaName, String propertyName) {
        patchSchemaProperty(openApi, schemaName, propertyName, schema -> schema.setMinLength(null));
    }

    private void clearSchemaPropertyMaxLength(OpenAPI openApi, String schemaName, String propertyName) {
        patchSchemaProperty(openApi, schemaName, propertyName, schema -> schema.setMaxLength(null));
    }

    private void clearSchemaPropertyMinItems(OpenAPI openApi, String schemaName, String propertyName) {
        patchSchemaProperty(openApi, schemaName, propertyName, schema -> schema.setMinItems(null));
    }

    private void clearSchemaPropertyFormat(OpenAPI openApi, String schemaName, String propertyName) {
        patchSchemaProperty(openApi, schemaName, propertyName, schema -> schema.setFormat(null));
    }

    private void patchSchemaProperty(
            OpenAPI openApi,
            String schemaName,
            String propertyName,
            java.util.function.Consumer<Schema<Object>> patch
    ) {
        Schema<?> schema = componentSchema(openApi, schemaName);
        if (schema == null || schema.getProperties() == null) {
            return;
        }
        Object property = schema.getProperties().get(propertyName);
        if (!(property instanceof Schema<?> propertySchema)) {
            return;
        }
        @SuppressWarnings("unchecked")
        Schema<Object> typedSchema = (Schema<Object>) propertySchema;
        patch.accept(typedSchema);
    }

    private void replaceSchemaProperty(
            OpenAPI openApi,
            String schemaName,
            String propertyName,
            Schema<Object> replacement
    ) {
        Schema<?> schema = componentSchema(openApi, schemaName);
        if (schema == null || schema.getProperties() == null) {
            return;
        }
        schema.getProperties().put(propertyName, replacement);
    }

    private Schema<?> componentSchema(OpenAPI openApi, String schemaName) {
        if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
            return null;
        }
        return openApi.getComponents().getSchemas().get(schemaName);
    }

    private Schema<Object> stringSchema(
            boolean nullable,
            String format,
            Integer minLength,
        Integer maxLength
    ) {
        Schema<Object> schema = new Schema<>();
        if (nullable) {
            schema.addType("null");
            schema.addType("string");
        } else {
            schema.addType("string");
        }
        schema.setFormat(format);
        schema.setMinLength(minLength);
        schema.setMaxLength(maxLength);
        return schema;
    }

    private Schema<Object> booleanSchema(boolean nullable) {
        Schema<Object> schema = new Schema<>();
        if (nullable) {
            schema.addType("boolean");
            schema.addType("null");
        } else {
            schema.setType("boolean");
        }
        return schema;
    }

    private Schema<Object> numericSchema(
            String type,
            boolean nullable,
            String minimum,
            String maximum,
            Integer defaultValue
    ) {
        Schema<Object> schema = new Schema<>();
        schema.addType(type);
        if (nullable) {
            schema.addType("null");
        }
        schema.setMinimum(new java.math.BigDecimal(minimum));
        schema.setMaximum(new java.math.BigDecimal(maximum));
        if (defaultValue != null) {
            schema.setDefault(defaultValue);
        }
        return schema;
    }
}
