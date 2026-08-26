package com.contentruck.hypofit.socialauth.service;


import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.entity.SocialAuthAttemptEntity;
import com.contentruck.hypofit.socialauth.entity.SocialAuthIdentityEntity;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SocialAuthService {

    private static final List<String> PROVIDERS = List.of("apple", "google", "kakao", "naver");
    private static final Set<String> AVAILABLE_STATES = Set.of("available", "disabled", "review_pending");
    private static final List<String> WEB_RETURN_PREFIXES = List.of(
            "/app",
            "/interviews",
            "/map",
            "/chat",
            "/profile",
            "/notifications"
    );
    private static final List<String> MOBILE_RETURN_PREFIXES = List.of(
            "/(tabs)/home",
            "/(tabs)/interviews",
            "/(tabs)/map",
            "/(tabs)/chat",
            "/(tabs)/profile",
            "/notifications"
    );

    private final SocialAuthRepository repository;
    private final SocialAuthAdminClient authAdminClient;
    private final SocialAuthAttemptStateWriter attemptStateWriter;
    private final HypofitProperties properties;
    private final int attemptTtlSeconds;

    public SocialAuthService(
            SocialAuthRepository repository,
            SocialAuthAdminClient authAdminClient,
            SocialAuthAttemptStateWriter attemptStateWriter,
            HypofitProperties properties,
            @Value("${hypofit.social-auth-attempt-ttl-seconds:600}") int attemptTtlSeconds
    ) {
        this.repository = repository;
        this.authAdminClient = authAdminClient;
        this.attemptStateWriter = attemptStateWriter;
        this.properties = properties;
        this.attemptTtlSeconds = attemptTtlSeconds;
    }

    @Transactional
    public SocialAuthReadModels.AttemptReadModel createAttempt(
            String provider,
            String platform,
            String flow,
            String returnPath
    ) {
        String normalizedFlow = normalizeFlow(flow);
        if (!"login".equals(normalizedFlow)) {
            throw new HypofitException(
                    "auth_required",
                    "로그인 후 연결할 수 있어요.",
                    HttpStatus.UNAUTHORIZED.value(),
                    "Public social auth attempts only support login flow"
            );
        }
        return createStoredAttempt(provider, platform, "login", returnPath, null);
    }

    @Transactional
    public SocialAuthReadModels.AttemptReadModel createLinkAttempt(
            UUID authUserId,
            String provider,
            String platform,
            String returnPath
    ) {
        SocialAuthRepository.UserAccountRecord account = requireActiveUserAccount(authUserId);
        ensureBoundUser(account.id(), authUserId);
        return createStoredAttempt(provider, platform, "link", returnPath, authUserId);
    }

    public SocialAuthReadModels.IdentityListReadModel listIdentities(UUID authUserId) {
        requireActiveUserAccount(authUserId);
        List<SocialAuthReadModels.IdentityReadModel> identities = repository.listUserIdentities(authUserId)
                .stream()
                .map(this::toIdentityReadModel)
                .toList();
        return new SocialAuthReadModels.IdentityListReadModel(identities);
    }

    @Transactional
    public SocialAuthReadModels.CompleteReadModel completeAttempt(
            UUID authUserId,
            UUID attemptId,
            String attemptSecret
    ) {
        SocialAuthAttemptEntity attempt = repository.findAttemptForUpdate(attemptId).orElse(null);
        if (attempt == null || !matchesSecret(attempt.getSecretHash(), attemptSecret)) {
            throw socialError(
                    "social_callback_expired",
                    "로그인 요청이 만료됐어요. 다시 시도해 주세요.",
                    HttpStatus.GONE,
                    "Social auth attempt was not found or secret mismatched"
            );
        }

        if ("completed".equals(attempt.getStatus())) {
            if (!authUserId.equals(attempt.getAuthUserId()) || isBlank(attempt.getResultNextStep())) {
                throw socialError(
                        "social_attempt_replayed",
                        "이미 처리된 로그인 요청이에요.",
                        HttpStatus.CONFLICT,
                        "Completed social auth attempt replay was rejected"
                );
            }
            persistCompletedAttemptIdentityIfPossible(attempt, authUserId);
            return completedAttemptResponse(attempt);
        }

        if (!"pending".equals(attempt.getStatus())) {
            throw socialError(
                    "social_attempt_replayed",
                    "이미 처리된 로그인 요청이에요.",
                    HttpStatus.CONFLICT,
                    "Non-pending social auth attempt replay was rejected"
            );
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (!attempt.getExpiresAt().isAfter(now)) {
            attemptStateWriter.markExpired(attemptId);
            throw socialError(
                    "social_callback_expired",
                    "로그인 요청이 만료됐어요. 다시 시도해 주세요.",
                    HttpStatus.GONE,
                    "Social auth attempt expired"
            );
        }

        if ("link".equals(attempt.getFlow())) {
            ensureAttemptOwner(attempt, authUserId);
        }

        SocialAuthReadModels.ProviderCapability capability = capability(attempt.getProvider(), attempt.getPlatform());
        requireAvailable(capability);

        SocialAuthAdminClient.SocialAuthAdminUser authUser = authAdminClient.getAuthUser(authUserId);
        SocialAuthReadModels.VerifiedProviderIdentity identity = findVerifiedIdentity(authUser.identities(), attempt.getProvider());
        SocialAuthRepository.UserAccountRecord appUser = repository.findUserAccount(authUserId).orElse(null);

        if (appUser != null && appUser.deletedAt() != null) {
            throw accountDeleted();
        }
        if (appUser != null && appUser.deactivatedAt() != null) {
            throw accountDeactivated();
        }
        if ("link".equals(attempt.getFlow()) && appUser == null) {
            throw permissionDenied("연결할 계정을 확인하지 못했어요.", "Linked app user could not be loaded");
        }

        SocialAuthIdentityEntity persistedIdentity = null;
        String nextStep;
        if (appUser != null) {
            IdentityReconciliationResult reconciliation = reconcileUserIdentities(
                    authUserId,
                    authUser.identities(),
                    now
            );
            persistedIdentity = reconciliation.persistedByProvider().get(identity.provider());
            nextStep = "signed_in";
        } else if (identity.email() == null || !Boolean.TRUE.equals(identity.emailVerified())) {
            nextStep = "email_required";
        } else {
            Optional<SocialAuthRepository.UserAccountRecord> emailOwner = repository.findUserAccountByEmail(identity.email());
            if (emailOwner.isPresent() && !authUserId.equals(emailOwner.get().id())) {
                throw socialError(
                        "social_account_link_required",
                        "기존 계정에서 로그인 방법을 연결해 주세요.",
                        HttpStatus.CONFLICT,
                        "Existing account already owns verified provider email"
                );
            }
            nextStep = "legal_consent_required";
        }

        attempt.setStatus("completed");
        attempt.setAuthUserId(authUserId);
        attempt.setResultNextStep(nextStep);
        attempt.setResultEmail(identity.email());
        attempt.setResultEmailVerified(identity.emailVerified());
        attempt.setCompletedAt(now);
        repository.recordAuditEvent(
                authUserId,
                "user",
                "social_auth_completed",
                "social_auth_identity",
                persistedIdentity == null ? null : persistedIdentity.getId(),
                null,
                socialAuthCompletedMetadata(identity.provider(), attempt.getPlatform(), attempt.getFlow(), nextStep)
        );

        return new SocialAuthReadModels.CompleteReadModel(
                identityRead(identity, persistedIdentity, now),
                nextStep,
                attempt.getReturnPath()
        );
    }

    @Transactional
    public SocialAuthReadModels.IdentityReconcileReadModel reconcileIdentities(
            UUID userId,
            UUID authUserId
    ) {
        ensureBoundUser(userId, authUserId);
        SocialAuthRepository.UserAccountRecord appUser = requireIdentityBoundUser(userId);
        if (appUser.deletedAt() != null) {
            throw accountDeleted();
        }
        if (appUser.deactivatedAt() != null) {
            throw accountDeactivated();
        }

        SocialAuthAdminClient.SocialAuthAdminUser authUser = authAdminClient.getAuthUser(authUserId);
        OffsetDateTime reconciledAt = OffsetDateTime.now(ZoneOffset.UTC);
        IdentityReconciliationResult reconciliation = reconcileUserIdentities(
                userId,
                authUser.identities(),
                reconciledAt
        );
        List<SocialAuthReadModels.IdentityReadModel> identities = reconciliation.identities().stream()
                .map(this::toIdentityReadModel)
                .toList();
        return new SocialAuthReadModels.IdentityReconcileReadModel(
                identities,
                reconciliation.revokedProviders(),
                reconciledAt
        );
    }

    private SocialAuthReadModels.AttemptReadModel createStoredAttempt(
            String provider,
            String platform,
            String flow,
            String returnPath,
            UUID boundAuthUserId
    ) {
        SocialAuthReadModels.ProviderCapability capability = capability(provider, platform);
        requireAvailable(capability);
        String safeReturnPath = safeReturnPath(normalizeReturnPath(returnPath), platform);
        String attemptSecret = UUID.randomUUID() + "-" + UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime expiresAt = now.plusSeconds(attemptTtlSeconds);

        SocialAuthAttemptEntity entity = new SocialAuthAttemptEntity();
        entity.setId(UUID.randomUUID());
        entity.setProvider(provider);
        entity.setPlatform(platform);
        entity.setFlow(flow);
        entity.setReturnPath(safeReturnPath);
        entity.setSecretHash(hmacValue(attemptSecret, properties.getSocialAuthAttemptPepper()));
        entity.setStatus("pending");
        entity.setAuthUserId(boundAuthUserId);
        entity.setExpiresAt(expiresAt);
        entity.setCreatedAt(now);
        repository.createAttempt(entity);

        return new SocialAuthReadModels.AttemptReadModel(
                entity.getId(),
                attemptSecret,
                entity.getProvider(),
                entity.getPlatform(),
                entity.getFlow(),
                entity.getReturnPath(),
                entity.getExpiresAt()
        );
    }

    private IdentityReconciliationResult reconcileUserIdentities(
            UUID userId,
            List<SocialAuthReadModels.VerifiedProviderIdentity> liveIdentities,
            OffsetDateTime usedAt
    ) {
        List<SocialAuthIdentityEntity> existingIdentities = repository.listUserIdentities(userId);
        Map<String, SocialAuthIdentityEntity> persistedByProvider = new LinkedHashMap<>();
        Set<UUID> matchedIdentityIds = new java.util.LinkedHashSet<>();

        for (SocialAuthReadModels.VerifiedProviderIdentity identity : liveIdentities) {
            String subjectHash = hmacValue(identity.subject(), properties.getSocialAuthIdentityPepper());
            repository.lockIdentityKeys(
                    userId,
                    identity.provider(),
                    subjectHash,
                    identity.supabaseIdentityId()
            );
            SocialAuthIdentityEntity existing = repository.findIdentityByProviderSubject(
                    identity.provider(),
                    subjectHash
            ).orElse(null);
            if (existing == null) {
                existing = repository.findIdentityBySupabaseIdentityId(identity.supabaseIdentityId()).orElse(null);
            }
            if (existing == null) {
                SocialAuthIdentityEntity sameProvider = repository.findIdentityByUserAndProvider(
                        userId,
                        identity.provider()
                ).orElse(null);
                if (sameProvider != null) {
                    if (!"revoked".equals(sameProvider.getStatus())) {
                        throw identityConflict();
                    }
                    existing = sameProvider;
                }
            }
            if (existing != null && !userId.equals(existing.getUserId())) {
                throw identityConflict();
            }

            SocialAuthIdentityEntity persisted = repository.upsertIdentity(
                    existing,
                    userId,
                    identity.provider(),
                    subjectHash,
                    identity.supabaseIdentityId(),
                    identity.email(),
                    identity.emailVerified(),
                    usedAt
            );
            matchedIdentityIds.add(persisted.getId());
            persistedByProvider.put(identity.provider(), persisted);
        }

        List<String> revokedProviders = new java.util.ArrayList<>();
        for (SocialAuthIdentityEntity identity : existingIdentities) {
            if (matchedIdentityIds.contains(identity.getId()) || "revoked".equals(identity.getStatus())) {
                continue;
            }
            repository.revokeIdentity(identity, usedAt);
            String normalizedProvider = normalizeProvider(identity.getProvider());
            if (normalizedProvider != null) {
                revokedProviders.add(normalizedProvider);
            }
        }

        return new IdentityReconciliationResult(
                repository.listUserIdentities(userId),
                persistedByProvider,
                revokedProviders
        );
    }

    private void persistCompletedAttemptIdentityIfPossible(
            SocialAuthAttemptEntity attempt,
            UUID authUserId
    ) {
        SocialAuthRepository.UserAccountRecord appUser = repository.findUserAccount(authUserId).orElse(null);
        if (appUser == null || appUser.deletedAt() != null || appUser.deactivatedAt() != null) {
            return;
        }
        if ("link".equals(attempt.getFlow())) {
            ensureAttemptOwner(attempt, authUserId);
        }
        SocialAuthAdminClient.SocialAuthAdminUser authUser = authAdminClient.getAuthUser(authUserId);
        reconcileUserIdentities(authUserId, authUser.identities(), OffsetDateTime.now(ZoneOffset.UTC));
    }

    private SocialAuthReadModels.VerifiedProviderIdentity findVerifiedIdentity(
            List<SocialAuthReadModels.VerifiedProviderIdentity> identities,
            String provider
    ) {
        return identities.stream()
                .filter(identity -> identity.provider().equals(provider))
                .findFirst()
                .orElseThrow(() -> socialError(
                        "social_identity_not_verified",
                        "로그인 정보를 확인하지 못했어요.",
                        HttpStatus.UNAUTHORIZED,
                        "Provider identity is missing from Supabase Admin user"
                ));
    }

    private SocialAuthReadModels.ProviderCapability capability(String provider, String platform) {
        String state;
        if ("android".equals(platform) && "apple".equals(provider)) {
            state = "unsupported_platform";
        } else if (!properties.isSocialAuthEnabled()) {
            state = "disabled";
        } else {
            state = configuredProviderState(provider, platform);
            if ("available".equals(state)
                    && (isBlank(properties.getSocialAuthAttemptPepper())
                    || isBlank(properties.getSocialAuthIdentityPepper()))) {
                state = "disabled";
            }
        }
        return new SocialAuthReadModels.ProviderCapability(provider, "available".equals(state), state);
    }

    private String configuredProviderState(String provider, String platform) {
        if ("apple".equals(provider) && ("web".equals(platform) || "ios".equals(platform))) {
            String override = "web".equals(platform)
                    ? properties.getSocialAuthAppleWebState()
                    : properties.getSocialAuthAppleIosState();
            if (!isBlank(override)) {
                return normalizeProviderState(override);
            }
        }
        return switch (provider) {
            case "apple" -> normalizeProviderState(properties.getSocialAuthAppleState());
            case "google" -> normalizeProviderState(properties.getSocialAuthGoogleState());
            case "kakao" -> normalizeProviderState(properties.getSocialAuthKakaoState());
            case "naver" -> normalizeProviderState(properties.getSocialAuthNaverState());
            default -> "disabled";
        };
    }

    private String normalizeProviderState(String rawState) {
        String normalized = rawState == null ? "" : rawState.trim().toLowerCase();
        return AVAILABLE_STATES.contains(normalized) ? normalized : "disabled";
    }

    private void requireAvailable(SocialAuthReadModels.ProviderCapability capability) {
        if ("unsupported_platform".equals(capability.state())) {
            throw socialError(
                    "social_unsupported_platform",
                    "이 기기에서는 해당 로그인을 사용할 수 없어요.",
                    HttpStatus.BAD_REQUEST,
                    "Unsupported platform for social provider"
            );
        }
        if ("review_pending".equals(capability.state())) {
            throw socialError(
                    "social_provider_review_pending",
                    "해당 로그인은 준비 중이에요.",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Social provider review is pending"
            );
        }
        if (!capability.enabled()) {
            throw socialError(
                    "social_provider_disabled",
                    "현재 사용할 수 없는 로그인 방법이에요.",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Social provider is disabled"
            );
        }
    }

    private String safeReturnPath(String value, String platform) {
        if (value == null) {
            return null;
        }
        if (value.chars().anyMatch(character -> character < 32) || value.contains("\\")) {
            throw invalidReturnPath();
        }
        if (!value.startsWith("/") || value.startsWith("//") || value.contains("://")) {
            throw invalidReturnPath();
        }
        List<String> prefixes = "web".equals(platform) ? WEB_RETURN_PREFIXES : MOBILE_RETURN_PREFIXES;
        boolean matches = prefixes.stream().anyMatch(prefix ->
                value.equals(prefix) || value.startsWith(prefix + "/") || value.startsWith(prefix + "?"));
        if (!matches) {
            throw invalidReturnPath();
        }
        return value;
    }

    private HypofitException invalidReturnPath() {
        return socialError(
                "social_state_mismatch",
                "로그인 후 이동할 화면을 확인하지 못했어요.",
                HttpStatus.BAD_REQUEST,
                "Unsafe social auth return path"
        );
    }

    private SocialAuthRepository.UserAccountRecord requireActiveUserAccount(UUID authUserId) {
        SocialAuthRepository.UserAccountRecord account = repository.findUserAccount(authUserId)
                .orElseThrow(() -> new HypofitException(
                        "profile_missing",
                        "프로필 설정이 필요해요.",
                        HttpStatus.FORBIDDEN.value(),
                        "Hypofit profile is required"
                ));
        if (account.deletedAt() != null) {
            throw accountDeleted();
        }
        if (account.deactivatedAt() != null) {
            throw accountDeactivated();
        }
        return account;
    }

    private SocialAuthRepository.UserAccountRecord requireIdentityBoundUser(UUID userId) {
        return repository.findUserAccount(userId)
                .orElseThrow(() -> permissionDenied(
                        "연결할 계정을 확인하지 못했어요.",
                        "Linked app user could not be loaded"
                ));
    }

    private void ensureBoundUser(UUID appUserId, UUID authUserId) {
        if (!appUserId.equals(authUserId)) {
            throw permissionDenied(
                    "다른 계정으로 연결 요청을 만들 수 없어요.",
                    "Current app user does not match auth user"
            );
        }
    }

    private void ensureAttemptOwner(SocialAuthAttemptEntity attempt, UUID authUserId) {
        if (!authUserId.equals(attempt.getAuthUserId())) {
            throw permissionDenied(
                    "다른 계정의 연결 요청은 완료할 수 없어요.",
                    "Current auth user does not own linked social auth attempt"
            );
        }
    }

    private SocialAuthReadModels.IdentityReadModel toIdentityReadModel(SocialAuthIdentityEntity identity) {
        return new SocialAuthReadModels.IdentityReadModel(
                identity.getProvider(),
                identity.getProviderEmail(),
                identity.getProviderEmailVerified(),
                identity.getStatus(),
                identity.getLinkedAt()
        );
    }

    private SocialAuthReadModels.IdentityReadModel identityRead(
            SocialAuthReadModels.VerifiedProviderIdentity identity,
            SocialAuthIdentityEntity persisted,
            OffsetDateTime linkedAt
    ) {
        return new SocialAuthReadModels.IdentityReadModel(
                identity.provider(),
                identity.email(),
                identity.emailVerified(),
                "active",
                persisted == null ? linkedAt : persisted.getLinkedAt()
        );
    }

    private SocialAuthReadModels.CompleteReadModel completedAttemptResponse(SocialAuthAttemptEntity attempt) {
        OffsetDateTime linkedAt = attempt.getCompletedAt() == null ? attempt.getCreatedAt() : attempt.getCompletedAt();
        return new SocialAuthReadModels.CompleteReadModel(
                new SocialAuthReadModels.IdentityReadModel(
                        attempt.getProvider(),
                        attempt.getResultEmail(),
                        attempt.getResultEmailVerified(),
                        "active",
                        linkedAt
                ),
                attempt.getResultNextStep(),
                attempt.getReturnPath()
        );
    }

    private Map<String, Object> socialAuthCompletedMetadata(
            String provider,
            String platform,
            String flow,
            String nextStep
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("provider", provider);
        metadata.put("platform", platform);
        metadata.put("flow", flow);
        metadata.put("next_step", nextStep);
        return metadata;
    }

    private String normalizeFlow(String flow) {
        String normalized = flow == null || flow.isBlank() ? "login" : flow.trim().toLowerCase();
        if (!"login".equals(normalized) && !"link".equals(normalized)) {
            return normalized;
        }
        return normalized;
    }

    private String normalizeReturnPath(String returnPath) {
        if (returnPath == null) {
            return null;
        }
        String trimmed = returnPath.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeProvider(String provider) {
        if (provider == null) {
            return null;
        }
        String normalized = provider.trim().toLowerCase();
        if ("custom:naver".equals(normalized)) {
            return "naver";
        }
        return PROVIDERS.contains(normalized) ? normalized : null;
    }

    private String hmacValue(String value, String pepper) {
        if (isBlank(pepper)) {
            throw socialError(
                    "social_provider_disabled",
                    "현재 사용할 수 없는 로그인 방법이에요.",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Social auth pepper is missing"
            );
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                builder.append(String.format("%02x", item));
            }
            return builder.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to compute social auth HMAC", exception);
        }
    }

    private boolean matchesSecret(String expectedHash, String value) {
        try {
            return java.security.MessageDigest.isEqual(
                    expectedHash.getBytes(StandardCharsets.UTF_8),
                    hmacValue(value, properties.getSocialAuthAttemptPepper()).getBytes(StandardCharsets.UTF_8)
            );
        } catch (HypofitException exception) {
            return false;
        }
    }

    private HypofitException identityConflict() {
        return socialError(
                "social_identity_conflict",
                "이미 다른 계정에 연결된 로그인 방법이에요.",
                HttpStatus.CONFLICT,
                "Social identity already belongs to another account"
        );
    }

    private HypofitException permissionDenied(String userMessage, String debugMessage) {
        return new HypofitException(
                "permission_denied",
                userMessage,
                HttpStatus.FORBIDDEN.value(),
                debugMessage
        );
    }

    private HypofitException accountDeleted() {
        return new HypofitException(
                "account_deleted",
                "삭제된 계정이에요.",
                HttpStatus.FORBIDDEN.value(),
                "Account is inactive"
        );
    }

    private HypofitException accountDeactivated() {
        return new HypofitException(
                "account_deactivated",
                "비활성화된 계정이에요.",
                HttpStatus.FORBIDDEN.value(),
                "Account is inactive"
        );
    }

    private HypofitException socialError(
            String code,
            String message,
            HttpStatus status,
            String debugMessage
    ) {
        return new HypofitException(code, message, status.value(), debugMessage);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record IdentityReconciliationResult(
            List<SocialAuthIdentityEntity> identities,
            Map<String, SocialAuthIdentityEntity> persistedByProvider,
            List<String> revokedProviders
    ) {
    }
}
