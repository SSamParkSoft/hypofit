package com.contentruck.hypofit.interview.application;

import com.contentruck.hypofit.audit.application.AuditEventCommand;
import com.contentruck.hypofit.audit.application.AuditWriteService;
import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.interview.domain.InterviewPostActorAccount;
import com.contentruck.hypofit.interview.domain.InterviewPostReadModel;
import com.contentruck.hypofit.interview.domain.InterviewPostWriteModel;
import com.contentruck.hypofit.user.application.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.application.UserAccountDeletedException;
import com.contentruck.hypofit.user.application.UserProfileMissingException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterviewPostWriteService {

    private static final Set<String> FOUNDER_ROLES = Set.of("founder", "both");
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

    private final InterviewPostWriteRepository repository;
    private final AuditWriteService auditWriteService;

    public InterviewPostWriteService(
            InterviewPostWriteRepository repository,
            AuditWriteService auditWriteService
    ) {
        this.repository = repository;
        this.auditWriteService = auditWriteService;
    }

    @Transactional
    public InterviewPostReadModel createPost(UUID actorUserId, InterviewPostCreateCommand command) {
        InterviewPostActorAccount actor = requireActiveUser(actorUserId);
        ensureFounderRole(actor);
        InterviewPostWriteModel created = repository.createPost(actorUserId, command);
        return toWriteResponse(created);
    }

    @Transactional
    public InterviewPostReadModel updatePost(UUID actorUserId, UUID postId, InterviewPostUpdateCommand command) {
        InterviewPostActorAccount actor = requireActiveUser(actorUserId);
        ensureFounderRole(actor);

        InterviewPostWriteModel post = repository.findPost(postId)
                .orElseThrow(InterviewPostNotFoundException::new);
        ensureOwner(post, actorUserId);
        ensurePostStatus(post.status(), EDITABLE_STATUSES, "edited");

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
        return toWriteResponse(updatedPost);
    }

    @Transactional
    public InterviewPostReadModel closePost(UUID actorUserId, UUID postId) {
        InterviewPostActorAccount actor = requireActiveUser(actorUserId);
        ensureFounderRole(actor);

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
        InterviewPostActorAccount actor = requireActiveUser(actorUserId);
        ensureFounderRole(actor);

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
        InterviewPostActorAccount actor = requireActiveUser(actorUserId);
        ensureFounderRole(actor);

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
        return toWriteResponse(updatedPost);
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

    private void ensureFounderRole(InterviewPostActorAccount actor) {
        if (!FOUNDER_ROLES.contains(actor.role())) {
            throw new InterviewPostPermissionDeniedException("Founder role required");
        }
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

    private Map<String, Object> buildPostChanges(InterviewPostWriteModel post, InterviewPostUpdateCommand command) {
        Map<String, Object> changes = new LinkedHashMap<>();
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

        if ("online".equals(effective.get("interviewMode"))) {
            boolean shouldClearLocation = command.hasField("interviewMode")
                    || LOCATION_FIELDS.stream().anyMatch(command::hasField);
            if (shouldClearLocation) {
                for (String fieldName : LOCATION_FIELDS) {
                    effective.put(fieldName, null);
                    changes.put(fieldName, null);
                }
            }
        } else {
            mirrorLocationTextFields(effective, changes);
            validateOfflineCapableLocation(effective);
        }

        for (String fieldName : LOCATION_FIELDS) {
            if (changes.containsKey(fieldName)) {
                changes.put(fieldName, effective.get(fieldName));
            }
        }

        return changes;
    }

    private Map<String, Object> serialize(InterviewPostWriteModel post) {
        Map<String, Object> serialized = new LinkedHashMap<>();
        serialized.put("title", post.title());
        serialized.put("serviceSummary", post.serviceSummary());
        serialized.put("targetDescription", post.targetDescription());
        serialized.put("rewardAmount", post.rewardAmount());
        serialized.put("durationMinutes", post.durationMinutes());
        serialized.put("recruitCount", post.recruitCount());
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
                post.title(),
                post.serviceSummary(),
                post.targetDescription(),
                post.rewardAmount(),
                post.durationMinutes(),
                post.recruitCount(),
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
                null,
                null,
                null
        );
    }

    private Map<String, Object> serializeForAudit(InterviewPostWriteModel post) {
        Map<String, Object> serialized = new LinkedHashMap<>();
        serialized.put("title", post.title());
        serialized.put("service_summary", post.serviceSummary());
        serialized.put("target_description", post.targetDescription());
        serialized.put("reward_amount", post.rewardAmount());
        serialized.put("duration_minutes", post.durationMinutes());
        serialized.put("recruit_count", post.recruitCount());
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
            case "serviceSummary" -> "service_summary";
            case "targetDescription" -> "target_description";
            case "rewardAmount" -> "reward_amount";
            case "durationMinutes" -> "duration_minutes";
            case "recruitCount" -> "recruit_count";
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

    private boolean isModerated(String status) {
        return "hidden".equals(status) || "removed".equals(status);
    }

    private String joinAllowed(Set<String> allowed) {
        return allowed.stream().sorted().collect(Collectors.joining(", "));
    }

    private String asString(Object value) {
        return value == null ? null : (String) value;
    }

    private Double asDouble(Object value) {
        return value == null ? null : ((Number) value).doubleValue();
    }

    private boolean hasValue(String value) {
        return value != null && !value.isEmpty();
    }
}
