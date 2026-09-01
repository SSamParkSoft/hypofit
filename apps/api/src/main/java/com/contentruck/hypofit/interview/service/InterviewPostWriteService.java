package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.ai.service.AiSummaryEnqueueService;
import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.user.service.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.net.IDN;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterviewPostWriteService {

    private static final String INTERVIEW_RECRUITMENT_TYPE = "interview";
    private static final String SURVEY_RECRUITMENT_TYPE = "survey";
    private static final String BETA_TEST_RECRUITMENT_TYPE = "beta_test";
    private static final Set<String> EXTENDED_RECRUITMENT_TYPES = Set.of(
            "usability_test", "research_experiment", "focus_group", "other"
    );
    private static final String GOOGLE_FORMS_PROVIDER = "google_forms";
    private static final Set<String> APPROVED_SURVEY_HOSTS = Set.of("docs.google.com", "forms.gle");
    private static final Set<String> EDITABLE_STATUSES = Set.of("draft", "open", "closed");
    private static final Set<String> ARCHIVABLE_STATUSES = Set.of("draft", "open", "closed");
    private static final Set<String> REOPENABLE_STATUSES = Set.of("closed", "archived");
    private static final Set<String> LOCATION_FIELDS = Set.of(
            "location",
            "locationText",
            "locationAddress",
            "locationPlaceName",
            "locationLatitude",
            "locationLongitude",
            "locationPrecision",
            "locationSource"
    );
    private static final Set<String> SURVEY_FIELDS = Set.of(
            "externalProvider",
            "externalUrl",
            "participationDeadlineAt",
            "externalDataNotice"
    );
    private static final Set<String> BETA_FIELDS = Set.of(
            "betaTestPlatforms",
            "betaTestStartsAt",
            "betaTestEndsAt"
    );

    private final InterviewPostWriteRepository repository;
    private final AuditWriteService auditWriteService;
    private final HypofitProperties properties;
    private final AiSummaryEnqueueService aiSummaryEnqueueService;
    private final MeterRegistry meterRegistry;

    @Autowired
    public InterviewPostWriteService(
            InterviewPostWriteRepository repository,
            AuditWriteService auditWriteService,
            HypofitProperties properties,
            AiSummaryEnqueueService aiSummaryEnqueueService,
            MeterRegistry meterRegistry
    ) {
        this.repository = repository;
        this.auditWriteService = auditWriteService;
        this.properties = properties;
        this.aiSummaryEnqueueService = aiSummaryEnqueueService;
        this.meterRegistry = meterRegistry;
    }

    @Transactional
    public InterviewPostReadModel createPost(UUID actorUserId, InterviewPostCreateCommand command) {
        return createPost(actorUserId, command, null);
    }

    @Transactional
    public InterviewPostReadModel createPost(
            UUID actorUserId,
            InterviewPostCreateCommand command,
            UUID clientSubmissionId
    ) {
        try {
            requireActiveUser(actorUserId);
            InterviewPostCreateCommand normalizedCommand = normalizeCreateCommand(command);
            if (clientSubmissionId != null) {
                repository.lockClientSubmission(actorUserId, clientSubmissionId);
                InterviewPostReadModel existing = repository
                        .findPostByClientSubmissionId(actorUserId, clientSubmissionId)
                        .map(this::toWriteResponse)
                        .orElse(null);
                if (existing != null) {
                    if (!matchesNormalizedCreateCommand(existing, normalizedCommand)) {
                        throw new InterviewPostIdempotencyConflictException();
                    }
                    recordCreateOutcome("replayed");
                    return existing;
                }
            }
            InterviewPostWriteModel created = clientSubmissionId == null
                    ? repository.createPost(actorUserId, normalizedCommand)
                    : repository.createPost(actorUserId, normalizedCommand, clientSubmissionId);
            enqueueWhenOpen(created);
            recordCreateOutcome("created");
            return toWriteResponse(created);
        } catch (InterviewPostIdempotencyConflictException exception) {
            recordCreateOutcome("idempotency_conflict");
            throw exception;
        } catch (RuntimeException exception) {
            recordCreateOutcome("failed");
            throw exception;
        }
    }

    private void recordCreateOutcome(String outcome) {
        meterRegistry.counter("hypofit.interview_post.create", "outcome", outcome).increment();
    }

    private boolean matchesNormalizedCreateCommand(
            InterviewPostReadModel existing,
            InterviewPostCreateCommand command
    ) {
        return Objects.equals(existing.recruitmentType(), command.recruitmentType())
                && Objects.equals(existing.title(), command.title())
                && Objects.equals(existing.serviceSummary(), command.serviceSummary())
                && Objects.equals(existing.targetDescription(), command.targetDescription())
                && Objects.equals(existing.rewardAmount(), command.rewardAmount())
                && Objects.equals(existing.compensations(), command.compensations())
                && Objects.equals(existing.durationMinutes(), command.durationMinutes())
                && Objects.equals(existing.recruitCount(), command.recruitCount())
                && Objects.equals(existing.externalProvider(), command.externalProvider())
                && Objects.equals(existing.externalUrl(), command.externalUrl())
                && Objects.equals(existing.participationDeadlineAt(), command.participationDeadlineAt())
                && Objects.equals(existing.externalDataNotice(), command.externalDataNotice())
                && Objects.equals(existing.betaTestPlatforms(), command.betaTestPlatforms())
                && Objects.equals(existing.betaTestStartsAt(), command.betaTestStartsAt())
                && Objects.equals(existing.betaTestEndsAt(), command.betaTestEndsAt())
                && Objects.equals(existing.interviewMode(), command.interviewMode())
                && Objects.equals(existing.location(), location(command))
                && Objects.equals(existing.locationText(), locationText(command))
                && Objects.equals(existing.locationAddress(), command.locationAddress())
                && Objects.equals(existing.locationPlaceName(), command.locationPlaceName())
                && Objects.equals(existing.locationLatitude(), command.locationLatitude())
                && Objects.equals(existing.locationLongitude(), command.locationLongitude())
                && Objects.equals(existing.locationPrecision(), command.locationPrecision())
                && Objects.equals(existing.locationSource(), command.locationSource())
                && Objects.equals(existing.scheduleOptions(), command.scheduleOptions())
                && Objects.equals(existing.status(), command.status())
                && Objects.equals(existing.entryMode(), command.entryMode());
    }

    private String location(InterviewPostCreateCommand command) {
        return command.location() != null ? command.location() : command.locationText();
    }

    private String locationText(InterviewPostCreateCommand command) {
        return command.locationText() != null ? command.locationText() : command.location();
    }

    @Transactional
    public InterviewPostReadModel updatePost(UUID actorUserId, UUID postId, InterviewPostUpdateCommand command) {
        requireActiveUser(actorUserId);

        InterviewPostWriteModel post = repository.findPost(postId)
                .orElseThrow(InterviewPostNotFoundException::new);
        ensureOwner(post, actorUserId);
        ensurePostStatus(post.status(), EDITABLE_STATUSES, "edited");
        if (command.hasField("recruitmentType")) {
            ensureRecruitmentTypeTransitionEnabled(post.recruitmentType(), command.recruitmentType());
        }

        Map<String, Object> before = serializeForAudit(post);
        Map<String, Object> changes = buildPostChanges(post, command);
        InterviewPostWriteModel updatedPost = repository.updatePost(postId, changes);
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "interview_post_updated",
                "interview_post",
                updatedPost.id(),
                before,
                serializeForAudit(updatedPost),
                null,
                Map.of(
                        "founder_id", updatedPost.founderId().toString(),
                        "updated_fields", toAuditUpdatedFields(changes)
                )
        ));
        enqueueWhenOpen(updatedPost);
        return toWriteResponse(updatedPost);
    }

    @Transactional
    public InterviewPostReadModel closePost(UUID actorUserId, UUID postId) {
        requireActiveUser(actorUserId);

        InterviewPostWriteModel post = repository.findPost(postId)
                .orElseThrow(InterviewPostNotFoundException::new);
        ensureOwner(post, actorUserId);
        ensurePostStatus(post.status(), Set.of("open"), "closed");

        InterviewPostWriteModel updatedPost = repository.updateStatus(postId, "closed");
        recordStatusAudit(actorUserId, post, updatedPost, "interview_post_closed");
        return toWriteResponse(updatedPost);
    }

    @Transactional
    public InterviewPostReadModel archivePost(UUID actorUserId, UUID postId) {
        requireActiveUser(actorUserId);

        InterviewPostWriteModel post = repository.findPost(postId)
                .orElseThrow(InterviewPostNotFoundException::new);
        ensureOwner(post, actorUserId);
        ensurePostStatus(post.status(), ARCHIVABLE_STATUSES, "archived");

        InterviewPostWriteModel updatedPost = repository.updateStatus(postId, "archived");
        recordStatusAudit(actorUserId, post, updatedPost, "interview_post_archived");
        return toWriteResponse(updatedPost);
    }

    @Transactional
    public InterviewPostReadModel reopenPost(UUID actorUserId, UUID postId) {
        requireActiveUser(actorUserId);

        InterviewPostWriteModel post = repository.findPost(postId)
                .orElseThrow(InterviewPostNotFoundException::new);
        ensureOwner(post, actorUserId);

        if (isModerated(post.status())) {
            throw new InterviewPostConflictException("Moderated interview posts cannot be changed by founders");
        }
        if (!REOPENABLE_STATUSES.contains(post.status())) {
            throw new InterviewPostConflictException(
                    "Only %s interview posts can be reopened".formatted(joinAllowed(REOPENABLE_STATUSES))
            );
        }

        InterviewPostWriteModel updatedPost = repository.updateStatus(postId, "open");
        recordStatusAudit(actorUserId, post, updatedPost, "interview_post_reopened");
        enqueueWhenOpen(updatedPost);
        return toWriteResponse(updatedPost);
    }

    private void enqueueWhenOpen(InterviewPostWriteModel post) {
        if ("open".equals(post.status())) {
            aiSummaryEnqueueService.enqueueInterviewSummary(post.id());
        }
    }

    private InterviewPostActorAccount requireActiveUser(UUID userId) {
        InterviewPostActorAccount account = repository.findUserAccount(userId)
                .orElseThrow(UserProfileMissingException::new);
        if (account.deleted()) {
            throw new UserAccountDeletedException();
        }
        if (account.deactivated()) {
            throw new UserAccountDeactivatedException();
        }
        return account;
    }

    private void ensureOwner(InterviewPostWriteModel post, UUID actorUserId) {
        if (!post.founderId().equals(actorUserId)) {
            throw new InterviewPostPermissionDeniedException("Forbidden");
        }
    }

    private void ensurePostStatus(String status, Set<String> allowed, String action) {
        if (isModerated(status)) {
            throw new InterviewPostConflictException("Moderated interview posts cannot be changed by founders");
        }
        if ("archived".equals(status)) {
            throw new InterviewPostConflictException("Archived interview posts cannot be changed");
        }
        if (!allowed.contains(status)) {
            throw new InterviewPostConflictException(
                    "Only %s interview posts can be %s".formatted(joinAllowed(allowed), action)
            );
        }
    }

    private InterviewPostCreateCommand normalizeCreateCommand(InterviewPostCreateCommand command) {
        String recruitmentType = command.recruitmentType();
        ensureRecruitmentTypeCreationEnabled(recruitmentType);
        List<PostingCompensation> compensations = PostingCompensations.normalize(
                command.compensations(), command.rewardAmount()
        );
        int legacyRewardAmount = PostingCompensations.legacyRewardAmount(compensations);

        if (INTERVIEW_RECRUITMENT_TYPE.equals(recruitmentType)) {
            validateInterviewCreate(command);
            boolean online = "online".equals(command.interviewMode());
            return new InterviewPostCreateCommand(
                    recruitmentType,
                    command.title(),
                    command.serviceSummary(),
                    command.targetDescription(),
                    legacyRewardAmount,
                    compensations,
                    command.durationMinutes(),
                    command.recruitCount(),
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    null,
                    null,
                    command.interviewMode(),
                    online ? null : command.location(),
                    online ? null : command.locationText(),
                    online ? null : command.locationAddress(),
                    online ? null : command.locationPlaceName(),
                    online ? null : command.locationLatitude(),
                    online ? null : command.locationLongitude(),
                    online ? null : command.locationPrecision(),
                    online ? null : command.locationSource(),
                    safeScheduleOptions(command.scheduleOptions()),
                    command.status(),
                    command.entryMode()
            );
        }

        if (SURVEY_RECRUITMENT_TYPE.equals(recruitmentType)) {
            String externalProvider = normalizeText(command.externalProvider());
            String externalUrl = normalizeText(command.externalUrl());
            String externalDataNotice = normalizeText(command.externalDataNotice());
            validateSurveyConfiguration(
                    externalProvider,
                    externalUrl,
                    command.participationDeadlineAt(),
                    externalDataNotice
            );
            return new InterviewPostCreateCommand(
                    recruitmentType,
                    command.title(),
                    command.serviceSummary(),
                    command.targetDescription(),
                    legacyRewardAmount,
                    compensations,
                    command.durationMinutes(),
                    command.recruitCount(),
                    externalProvider,
                    externalUrl,
                    command.participationDeadlineAt(),
                    externalDataNotice,
                    List.of(),
                    null,
                    null,
                    "online",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    command.status(),
                    command.entryMode()
            );
        }

        if (BETA_TEST_RECRUITMENT_TYPE.equals(recruitmentType)) {
            List<String> betaTestPlatforms = normalizePlatforms(command.betaTestPlatforms());
            validateBetaConfiguration(betaTestPlatforms, command.betaTestStartsAt(), command.betaTestEndsAt());
            return new InterviewPostCreateCommand(
                    recruitmentType,
                    command.title(),
                    command.serviceSummary(),
                    command.targetDescription(),
                    legacyRewardAmount,
                    compensations,
                    command.durationMinutes(),
                    command.recruitCount(),
                    null,
                    null,
                    null,
                    null,
                    betaTestPlatforms,
                    command.betaTestStartsAt(),
                    command.betaTestEndsAt(),
                    "online",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    command.status(),
                    command.entryMode()
            );
        }

        if (EXTENDED_RECRUITMENT_TYPES.contains(recruitmentType)) {
            return new InterviewPostCreateCommand(
                    recruitmentType,
                    command.title(),
                    command.serviceSummary(),
                    command.targetDescription(),
                    legacyRewardAmount,
                    compensations,
                    command.durationMinutes(),
                    command.recruitCount(),
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    null,
                    null,
                    "online",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    command.status(),
                    command.entryMode()
            );
        }

        throw new InterviewPostRecruitmentTypeNotSupportedException(recruitmentType);
    }

    private Map<String, Object> buildPostChanges(InterviewPostWriteModel post, InterviewPostUpdateCommand command) {
        Map<String, Object> changes = new LinkedHashMap<>();
        if (command.hasField("recruitmentType")) {
            changes.put("recruitmentType", command.recruitmentType());
        }
        if (command.hasField("title")) {
            changes.put("title", command.title());
        }
        if (command.hasField("serviceSummary")) {
            changes.put("serviceSummary", command.serviceSummary());
        }
        if (command.hasField("targetDescription")) {
            changes.put("targetDescription", command.targetDescription());
        }
        if (command.hasField("rewardAmount")) {
            changes.put("rewardAmount", command.rewardAmount());
        }
        if (command.hasField("durationMinutes")) {
            changes.put("durationMinutes", command.durationMinutes());
        }
        if (command.hasField("recruitCount")) {
            changes.put("recruitCount", command.recruitCount());
        }
        if (command.hasField("externalProvider")) {
            changes.put("externalProvider", command.externalProvider());
        }
        if (command.hasField("entryMode")) {
            changes.put("entryMode", command.entryMode());
        }
        if (command.hasField("externalUrl")) {
            changes.put("externalUrl", command.externalUrl());
        }
        if (command.hasField("participationDeadlineAt")) {
            changes.put("participationDeadlineAt", command.participationDeadlineAt());
        }
        if (command.hasField("externalDataNotice")) {
            changes.put("externalDataNotice", command.externalDataNotice());
        }
        if (command.hasField("betaTestPlatforms")) {
            changes.put("betaTestPlatforms", command.betaTestPlatforms());
        }
        if (command.hasField("betaTestStartsAt")) {
            changes.put("betaTestStartsAt", command.betaTestStartsAt());
        }
        if (command.hasField("betaTestEndsAt")) {
            changes.put("betaTestEndsAt", command.betaTestEndsAt());
        }
        if (command.hasField("interviewMode")) {
            changes.put("interviewMode", command.interviewMode());
        }
        if (command.hasField("location")) {
            changes.put("location", command.location());
        }
        if (command.hasField("locationText")) {
            changes.put("locationText", command.locationText());
        }
        if (command.hasField("locationAddress")) {
            changes.put("locationAddress", command.locationAddress());
        }
        if (command.hasField("locationPlaceName")) {
            changes.put("locationPlaceName", command.locationPlaceName());
        }
        if (command.hasField("locationLatitude")) {
            changes.put("locationLatitude", command.locationLatitude());
        }
        if (command.hasField("locationLongitude")) {
            changes.put("locationLongitude", command.locationLongitude());
        }
        if (command.hasField("locationPrecision")) {
            changes.put("locationPrecision", command.locationPrecision());
        }
        if (command.hasField("locationSource")) {
            changes.put("locationSource", command.locationSource());
        }
        if (command.hasField("scheduleOptions")) {
            changes.put("scheduleOptions", command.scheduleOptions());
        }
        if (command.hasField("status")) {
            changes.put("status", command.status());
        }

        Map<String, Object> effective = serialize(post);
        effective.putAll(changes);
        String effectiveRecruitmentType = asString(effective.get("recruitmentType"));

        if (INTERVIEW_RECRUITMENT_TYPE.equals(effectiveRecruitmentType)) {
            clearSurveyFields(effective, changes);
            clearBetaFields(effective, changes);
            validateInterviewUpdate(command, post, effective, changes);
        } else if (SURVEY_RECRUITMENT_TYPE.equals(effectiveRecruitmentType)) {
            forceNonInterviewCompatibility(effective, changes);
            clearBetaFields(effective, changes);
            normalizeSurveyFields(effective, changes);
            validateSurveyConfiguration(
                    asString(effective.get("externalProvider")),
                    asString(effective.get("externalUrl")),
                    asOffsetDateTime(effective.get("participationDeadlineAt")),
                    asString(effective.get("externalDataNotice"))
            );
        } else if (BETA_TEST_RECRUITMENT_TYPE.equals(effectiveRecruitmentType)) {
            forceNonInterviewCompatibility(effective, changes);
            clearSurveyFields(effective, changes);
            normalizeBetaFields(effective, changes);
            validateBetaConfiguration(
                    asStringList(effective.get("betaTestPlatforms")),
                    asOffsetDateTime(effective.get("betaTestStartsAt")),
                    asOffsetDateTime(effective.get("betaTestEndsAt"))
            );
        } else {
            throw new InterviewPostRecruitmentTypeNotSupportedException(effectiveRecruitmentType);
        }

        return changes;
    }

    private Map<String, Object> serialize(InterviewPostWriteModel post) {
        Map<String, Object> serialized = new LinkedHashMap<>();
        serialized.put("recruitmentType", post.recruitmentType());
        serialized.put("entryMode", post.entryMode());
        serialized.put("title", post.title());
        serialized.put("serviceSummary", post.serviceSummary());
        serialized.put("targetDescription", post.targetDescription());
        serialized.put("rewardAmount", post.rewardAmount());
        serialized.put("durationMinutes", post.durationMinutes());
        serialized.put("recruitCount", post.recruitCount());
        serialized.put("externalProvider", post.externalProvider());
        serialized.put("externalUrl", post.externalUrl());
        serialized.put("participationDeadlineAt", post.participationDeadlineAt());
        serialized.put("externalDataNotice", post.externalDataNotice());
        serialized.put("betaTestPlatforms", post.betaTestPlatforms());
        serialized.put("betaTestStartsAt", post.betaTestStartsAt());
        serialized.put("betaTestEndsAt", post.betaTestEndsAt());
        serialized.put("interviewMode", post.interviewMode());
        serialized.put("location", post.location());
        serialized.put("locationText", post.locationText());
        serialized.put("locationAddress", post.locationAddress());
        serialized.put("locationPlaceName", post.locationPlaceName());
        serialized.put("locationLatitude", post.locationLatitude());
        serialized.put("locationLongitude", post.locationLongitude());
        serialized.put("locationPrecision", post.locationPrecision());
        serialized.put("locationSource", post.locationSource());
        serialized.put("scheduleOptions", post.scheduleOptions());
        serialized.put("status", post.status());
        return serialized;
    }

    private InterviewPostReadModel toWriteResponse(InterviewPostWriteModel post) {
        return new InterviewPostReadModel(
                post.id(),
                post.founderId(),
                post.recruitmentType(),
                post.entryMode(),
                post.title(),
                post.serviceSummary(),
                post.targetDescription(),
                post.rewardAmount(),
                post.compensations(),
                post.durationMinutes(),
                post.recruitCount(),
                post.externalProvider(),
                post.externalUrl(),
                post.participationDeadlineAt(),
                post.externalDataNotice(),
                post.betaTestPlatforms(),
                post.betaTestStartsAt(),
                post.betaTestEndsAt(),
                post.interviewMode(),
                post.location(),
                post.locationText(),
                post.locationAddress(),
                post.locationPlaceName(),
                post.locationLatitude(),
                post.locationLongitude(),
                post.locationPrecision(),
                post.locationSource(),
                post.scheduleOptions(),
                post.status(),
                post.createdAt(),
                null,
                null,
                null,
                null
        );
    }

    private Map<String, Object> serializeForAudit(InterviewPostWriteModel post) {
        Map<String, Object> serialized = new LinkedHashMap<>();
        serialized.put("recruitment_type", post.recruitmentType());
        serialized.put("entry_mode", post.entryMode());
        serialized.put("title", post.title());
        serialized.put("service_summary", post.serviceSummary());
        serialized.put("target_description", post.targetDescription());
        serialized.put("reward_amount", post.rewardAmount());
        serialized.put("duration_minutes", post.durationMinutes());
        serialized.put("recruit_count", post.recruitCount());
        serialized.put("external_provider", post.externalProvider());
        serialized.put("external_url", post.externalUrl());
        serialized.put("participation_deadline_at", post.participationDeadlineAt());
        serialized.put("external_data_notice", post.externalDataNotice());
        serialized.put("beta_test_platforms", post.betaTestPlatforms() == null ? List.of() : List.copyOf(post.betaTestPlatforms()));
        serialized.put("beta_test_starts_at", post.betaTestStartsAt());
        serialized.put("beta_test_ends_at", post.betaTestEndsAt());
        serialized.put("interview_mode", post.interviewMode());
        serialized.put("location", post.location());
        serialized.put("location_text", post.locationText());
        serialized.put("location_address", post.locationAddress());
        serialized.put("location_place_name", post.locationPlaceName());
        serialized.put("location_latitude", post.locationLatitude());
        serialized.put("location_longitude", post.locationLongitude());
        serialized.put("location_precision", post.locationPrecision());
        serialized.put("location_source", post.locationSource());
        serialized.put("schedule_options", post.scheduleOptions() == null ? List.of() : List.copyOf(post.scheduleOptions()));
        serialized.put("status", post.status());
        return serialized;
    }

    private List<String> toAuditUpdatedFields(Map<String, Object> changes) {
        return changes.keySet().stream()
                .map(this::toAuditFieldName)
                .sorted()
                .toList();
    }

    private String toAuditFieldName(String fieldName) {
        return switch (fieldName) {
            case "recruitmentType" -> "recruitment_type";
            case "serviceSummary" -> "service_summary";
            case "targetDescription" -> "target_description";
            case "rewardAmount" -> "reward_amount";
            case "durationMinutes" -> "duration_minutes";
            case "recruitCount" -> "recruit_count";
            case "externalProvider" -> "external_provider";
            case "externalUrl" -> "external_url";
            case "participationDeadlineAt" -> "participation_deadline_at";
            case "externalDataNotice" -> "external_data_notice";
            case "betaTestPlatforms" -> "beta_test_platforms";
            case "betaTestStartsAt" -> "beta_test_starts_at";
            case "betaTestEndsAt" -> "beta_test_ends_at";
            case "interviewMode" -> "interview_mode";
            case "locationText" -> "location_text";
            case "locationAddress" -> "location_address";
            case "locationPlaceName" -> "location_place_name";
            case "locationLatitude" -> "location_latitude";
            case "locationLongitude" -> "location_longitude";
            case "locationPrecision" -> "location_precision";
            case "locationSource" -> "location_source";
            case "scheduleOptions" -> "schedule_options";
            default -> fieldName;
        };
    }

    private void recordStatusAudit(
            UUID actorUserId,
            InterviewPostWriteModel before,
            InterviewPostWriteModel after,
            String eventType
    ) {
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                eventType,
                "interview_post",
                after.id(),
                serializeForAudit(before),
                serializeForAudit(after),
                null,
                Map.of("founder_id", after.founderId().toString())
        ));
    }

    private void mirrorLocationTextFields(Map<String, Object> effective, Map<String, Object> changes) {
        String location = asString(effective.get("location"));
        String locationText = asString(effective.get("locationText"));

        if (hasValue(location) && !changes.containsKey("locationText") && changes.containsKey("location")) {
            effective.put("locationText", location);
            changes.put("locationText", location);
            return;
        }
        if (hasValue(locationText) && !changes.containsKey("location") && changes.containsKey("locationText")) {
            effective.put("location", locationText);
            changes.put("location", locationText);
            return;
        }
        if (!hasValue(location) && hasValue(locationText)) {
            effective.put("location", locationText);
            changes.put("location", locationText);
            return;
        }
        if (!hasValue(locationText) && hasValue(location)) {
            effective.put("locationText", location);
            changes.put("locationText", location);
        }
    }

    private void validateInterviewCreate(InterviewPostCreateCommand command) {
        if (!hasText(command.interviewMode())) {
            throw validationFailed(
                    "Interview recruitment posts require interview_mode",
                    List.of(new FieldError("interview_mode", "입력값을 확인해 주세요."))
            );
        }
        if (!"online".equals(command.interviewMode())) {
            validateOfflineCapableLocation(Map.of(
                    "location", command.location(),
                    "locationText", command.locationText(),
                    "locationLatitude", command.locationLatitude(),
                    "locationLongitude", command.locationLongitude(),
                    "locationPrecision", command.locationPrecision(),
                    "locationSource", command.locationSource()
            ));
        }
    }

    private void validateInterviewUpdate(
            InterviewPostUpdateCommand command,
            InterviewPostWriteModel post,
            Map<String, Object> effective,
            Map<String, Object> changes
    ) {
        String interviewMode = asString(effective.get("interviewMode"));
        if (!hasText(interviewMode)) {
            throw validationFailed(
                    "Interview recruitment posts require interview_mode",
                    List.of(new FieldError("interview_mode", "입력값을 확인해 주세요."))
            );
        }
        if ("online".equals(interviewMode)) {
            boolean shouldClearLocation = (!INTERVIEW_RECRUITMENT_TYPE.equals(post.recruitmentType()) && command.hasField("recruitmentType"))
                    || command.hasField("interviewMode")
                    || LOCATION_FIELDS.stream().anyMatch(command::hasField);
            if (shouldClearLocation) {
                clearLocationFields(effective, changes);
            }
            return;
        }
        mirrorLocationTextFields(effective, changes);
        validateOfflineCapableLocation(effective);
    }

    private void forceNonInterviewCompatibility(Map<String, Object> effective, Map<String, Object> changes) {
        applyNormalizedChange(effective, changes, "interviewMode", "online");
        clearLocationFields(effective, changes);
        applyNormalizedChange(effective, changes, "scheduleOptions", List.of());
    }

    private void clearLocationFields(Map<String, Object> effective, Map<String, Object> changes) {
        for (String fieldName : LOCATION_FIELDS) {
            applyNormalizedChange(effective, changes, fieldName, null);
        }
    }

    private void clearSurveyFields(Map<String, Object> effective, Map<String, Object> changes) {
        for (String fieldName : SURVEY_FIELDS) {
            applyNormalizedChange(effective, changes, fieldName, null);
        }
    }

    private void clearBetaFields(Map<String, Object> effective, Map<String, Object> changes) {
        applyNormalizedChange(effective, changes, "betaTestPlatforms", List.of());
        applyNormalizedChange(effective, changes, "betaTestStartsAt", null);
        applyNormalizedChange(effective, changes, "betaTestEndsAt", null);
    }

    private void normalizeSurveyFields(Map<String, Object> effective, Map<String, Object> changes) {
        applyNormalizedChange(effective, changes, "externalProvider", normalizeText(asString(effective.get("externalProvider"))));
        applyNormalizedChange(effective, changes, "externalUrl", normalizeText(asString(effective.get("externalUrl"))));
        applyNormalizedChange(effective, changes, "externalDataNotice", normalizeText(asString(effective.get("externalDataNotice"))));
    }

    private void normalizeBetaFields(Map<String, Object> effective, Map<String, Object> changes) {
        applyNormalizedChange(effective, changes, "betaTestPlatforms", normalizePlatforms(asStringList(effective.get("betaTestPlatforms"))));
    }

    private void validateSurveyConfiguration(
            String externalProvider,
            String externalUrl,
            OffsetDateTime participationDeadlineAt,
            String externalDataNotice
    ) {
        List<FieldError> errors = new ArrayList<>();
        if (!GOOGLE_FORMS_PROVIDER.equals(externalProvider)) {
            errors.add(new FieldError("external_provider", "입력값을 확인해 주세요.", "survey_provider_not_supported"));
        }
        if (!hasText(externalUrl) || !isApprovedGoogleFormsUrl(externalUrl)) {
            errors.add(new FieldError("external_url", "입력값을 확인해 주세요.", "survey_url_invalid"));
        }
        if (participationDeadlineAt == null) {
            errors.add(new FieldError("participation_deadline_at", "입력값을 확인해 주세요."));
        }
        if (!hasText(externalDataNotice)) {
            errors.add(new FieldError("external_data_notice", "입력값을 확인해 주세요."));
        }
        if (!errors.isEmpty()) {
            throw validationFailed(
                    "Survey recruitment posts require an approved Google Forms URL, deadline, and data notice",
                    errors
            );
        }
    }

    private void validateBetaConfiguration(
            List<String> betaTestPlatforms,
            OffsetDateTime betaTestStartsAt,
            OffsetDateTime betaTestEndsAt
    ) {
        List<FieldError> errors = new ArrayList<>();
        if (betaTestPlatforms == null || betaTestPlatforms.isEmpty()) {
            errors.add(new FieldError("beta_test_platforms", "입력값을 확인해 주세요."));
        }
        if (betaTestStartsAt == null) {
            errors.add(new FieldError("beta_test_starts_at", "입력값을 확인해 주세요."));
        }
        if (betaTestEndsAt == null) {
            errors.add(new FieldError("beta_test_ends_at", "입력값을 확인해 주세요."));
        }
        if (betaTestStartsAt != null && betaTestEndsAt != null && !betaTestStartsAt.isBefore(betaTestEndsAt)) {
            errors.add(new FieldError("beta_test_ends_at", "입력값을 확인해 주세요."));
        }
        if (!errors.isEmpty()) {
            throw validationFailed(
                    "Beta-test recruitment posts require platforms and a valid start/end period",
                    errors
            );
        }
    }

    private void validateOfflineCapableLocation(Map<String, Object> effective) {
        String location = asString(effective.get("location"));
        String locationText = asString(effective.get("locationText"));
        Double latitude = asDouble(effective.get("locationLatitude"));
        Double longitude = asDouble(effective.get("locationLongitude"));
        String precision = asString(effective.get("locationPrecision"));
        String source = asString(effective.get("locationSource"));

        if ((!hasValue(locationText) && !hasValue(location))
                || latitude == null
                || longitude == null
                || precision == null
                || source == null) {
            throw new HypofitValidationException(
                    "Offline-capable interview posts require a selected location",
                    java.util.List.of(new FieldError("__root__", "Offline-capable interview posts require a selected location"))
            );
        }
    }

    private boolean isApprovedGoogleFormsUrl(String externalUrl) {
        try {
            URI uri = new URI(externalUrl);
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                return false;
            }
            if (uri.getUserInfo() != null) {
                return false;
            }
            String host = uri.getHost();
            if (!hasText(host)) {
                return false;
            }
            String asciiHost = IDN.toASCII(host.trim().toLowerCase());
            if (!APPROVED_SURVEY_HOSTS.contains(asciiHost) || isLocalOrIpLiteral(asciiHost)) {
                return false;
            }
            if ("docs.google.com".equals(asciiHost)) {
                return uri.getPath() != null && uri.getPath().startsWith("/forms/");
            }
            return "forms.gle".equals(asciiHost);
        } catch (URISyntaxException | IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean isLocalOrIpLiteral(String host) {
        return "localhost".equals(host)
                || host.matches("^\\d{1,3}(\\.\\d{1,3}){3}$")
                || host.contains(":");
    }

    private boolean isModerated(String status) {
        return "hidden".equals(status) || "removed".equals(status);
    }

    private String joinAllowed(Set<String> allowed) {
        return allowed.stream().sorted().collect(Collectors.joining(", "));
    }

    private String asString(Object value) {
        return value == null ? null : (String) value;
    }

    @SuppressWarnings("unchecked")
    private List<String> asStringList(Object value) {
        if (value == null) {
            return List.of();
        }
        return (List<String>) value;
    }

    private Double asDouble(Object value) {
        return value == null ? null : ((Number) value).doubleValue();
    }

    private OffsetDateTime asOffsetDateTime(Object value) {
        return value == null ? null : (OffsetDateTime) value;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private List<String> normalizePlatforms(List<String> platforms) {
        if (platforms == null || platforms.isEmpty()) {
            return List.of();
        }
        List<String> normalized = new ArrayList<>();
        for (String platform : platforms) {
            String trimmed = normalizeText(platform);
            if (trimmed != null && !normalized.contains(trimmed)) {
                normalized.add(trimmed);
            }
        }
        return List.copyOf(normalized);
    }

    private List<String> safeScheduleOptions(List<String> scheduleOptions) {
        return scheduleOptions == null ? List.of() : List.copyOf(scheduleOptions);
    }

    private void applyNormalizedChange(Map<String, Object> effective, Map<String, Object> changes, String fieldName, Object normalizedValue) {
        Object previous = effective.get(fieldName);
        effective.put(fieldName, normalizedValue);
        if (!Objects.equals(previous, normalizedValue)) {
            changes.put(fieldName, normalizedValue);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean hasValue(String value) {
        return value != null && !value.isEmpty();
    }

    private HypofitValidationException validationFailed(String debugMessage, List<FieldError> fieldErrors) {
        return new HypofitValidationException(debugMessage, List.copyOf(fieldErrors));
    }

    private void ensureRecruitmentTypeTransitionEnabled(String currentRecruitmentType, String requestedRecruitmentType) {
        if (Objects.equals(currentRecruitmentType, requestedRecruitmentType)) {
            return;
        }
        ensureRecruitmentTypeCreationEnabled(requestedRecruitmentType);
    }

    private void ensureRecruitmentTypeCreationEnabled(String recruitmentType) {
        if (INTERVIEW_RECRUITMENT_TYPE.equals(recruitmentType)) {
            return;
        }
        if (SURVEY_RECRUITMENT_TYPE.equals(recruitmentType) && properties.isSurveyRecruitmentCreationEnabled()) {
            return;
        }
        if (BETA_TEST_RECRUITMENT_TYPE.equals(recruitmentType) && properties.isBetaTestRecruitmentCreationEnabled()) {
            return;
        }
        if (EXTENDED_RECRUITMENT_TYPES.contains(recruitmentType) && properties.isExtendedRecruitmentCreationEnabled()) {
            return;
        }
        throw new InterviewPostRecruitmentTypeNotSupportedException(recruitmentType);
    }
}
