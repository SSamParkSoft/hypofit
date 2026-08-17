package com.contentruck.hypofit.socialauth.dto;

import com.contentruck.hypofit.socialauth.service.SocialAuthReadModels;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class SocialAuthWebModels {

    private SocialAuthWebModels() {
    }

    @Schema(hidden = true)
    @JsonIgnoreProperties(ignoreUnknown = false)
    public record SocialAuthAttemptCreateRequest(
            @Pattern(regexp = "apple|google|kakao|naver", message = "must match \"apple|google|kakao|naver\"")
            String provider,
            @Pattern(regexp = "web|ios|android", message = "must match \"web|ios|android\"")
            String platform,
            @Pattern(regexp = "login|link", message = "must match \"login|link\"")
            String flow,
            @JsonProperty("return_path")
            @Size(max = 2048)
            String return_path
    ) {
        @Schema(name = "SocialAuthAttemptCreate", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
        public record OpenApiSchema(
                @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"apple", "google", "kakao", "naver"})
                String provider,
                @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"web", "ios", "android"})
                String platform,
                @Schema(defaultValue = "login", allowableValues = {"login", "link"})
                String flow,
                @JsonProperty("return_path")
                @Schema(types = {"null", "string"}, maxLength = 2048)
                String returnPath
        ) {
        }
    }

    @Schema(hidden = true)
    @JsonIgnoreProperties(ignoreUnknown = false)
    public record SocialAuthLinkAttemptCreateRequest(
            @Pattern(regexp = "apple|google|kakao|naver", message = "must match \"apple|google|kakao|naver\"")
            String provider,
            @Pattern(regexp = "web|ios|android", message = "must match \"web|ios|android\"")
            String platform,
            @JsonProperty("return_path")
            @Size(max = 2048)
            String return_path
    ) {
        @Schema(name = "SocialAuthLinkAttemptCreate", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
        public record OpenApiSchema(
                @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"apple", "google", "kakao", "naver"})
                String provider,
                @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"web", "ios", "android"})
                String platform,
                @JsonProperty("return_path")
                @Schema(types = {"null", "string"}, maxLength = 2048)
                String returnPath
        ) {
        }
    }

    @Schema(hidden = true)
    @JsonIgnoreProperties(ignoreUnknown = false)
    public record SocialAuthCompleteRequest(
            @JsonProperty("attempt_id")
            UUID attempt_id,
            @JsonProperty("attempt_secret")
            @Size(min = 32, max = 256)
            String attempt_secret
    ) {
        @Schema(name = "SocialAuthComplete", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
        public record OpenApiSchema(
                @JsonProperty("attempt_id")
                @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid")
                UUID attemptId,
                @JsonProperty("attempt_secret")
                @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 32, maxLength = 256)
                String attemptSecret
        ) {
        }
    }

    public record SocialAuthAttemptResponse(
            @JsonProperty("attempt_id")
            UUID attempt_id,
            @JsonProperty("attempt_secret")
            String attempt_secret,
            @Schema(allowableValues = {"apple", "google", "kakao", "naver"})
            String provider,
            @Schema(allowableValues = {"web", "ios", "android"})
            String platform,
            @Schema(allowableValues = {"login", "link"})
            String flow,
            @JsonProperty("return_path")
            String return_path,
            @JsonProperty("expires_at")
            OffsetDateTime expires_at
    ) {
        public static SocialAuthAttemptResponse from(SocialAuthReadModels.AttemptReadModel model) {
            return new SocialAuthAttemptResponse(
                    model.attemptId(),
                    model.attemptSecret(),
                    model.provider(),
                    model.platform(),
                    model.flow(),
                    model.returnPath(),
                    model.expiresAt()
            );
        }
    }

    public record SocialIdentityResponse(
            @Schema(allowableValues = {"apple", "google", "kakao", "naver"})
            String provider,
            String email,
            @JsonProperty("email_verified")
            Boolean email_verified,
            @Schema(allowableValues = {"active", "revocation_pending", "revoked"})
            String status,
            @JsonProperty("linked_at")
            OffsetDateTime linked_at
    ) {
        public static SocialIdentityResponse from(SocialAuthReadModels.IdentityReadModel model) {
            return new SocialIdentityResponse(
                    model.provider(),
                    model.email(),
                    model.emailVerified(),
                    model.status(),
                    model.linkedAt()
            );
        }
    }

    public record SocialIdentityListResponse(
            List<SocialIdentityResponse> identities
    ) {
        public static SocialIdentityListResponse from(SocialAuthReadModels.IdentityListReadModel model) {
            return new SocialIdentityListResponse(
                    model.identities().stream().map(SocialIdentityResponse::from).toList()
            );
        }
    }

    public record SocialAuthCompleteResponse(
            SocialIdentityResponse identity,
            @JsonProperty("next_step")
            @Schema(allowableValues = {
                    "signed_in",
                    "email_required",
                    "legal_consent_required",
                    "role_onboarding_required",
                    "profile_completion_required"
            })
            String next_step,
            @JsonProperty("return_path")
            String return_path
    ) {
        public static SocialAuthCompleteResponse from(SocialAuthReadModels.CompleteReadModel model) {
            return new SocialAuthCompleteResponse(
                    SocialIdentityResponse.from(model.identity()),
                    model.nextStep(),
                    model.returnPath()
            );
        }
    }

    public record SocialIdentityReconcileResponse(
            List<SocialIdentityResponse> identities,
            @JsonProperty("revoked_providers")
            @ArraySchema(schema = @Schema(allowableValues = {"apple", "google", "kakao", "naver"}))
            List<String> revoked_providers,
            @JsonProperty("reconciled_at")
            OffsetDateTime reconciled_at
    ) {
        public static SocialIdentityReconcileResponse from(SocialAuthReadModels.IdentityReconcileReadModel model) {
            return new SocialIdentityReconcileResponse(
                    model.identities().stream().map(SocialIdentityResponse::from).toList(),
                    model.revokedProviders(),
                    model.reconciledAt()
            );
        }
    }
}
