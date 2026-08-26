package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.RewardConfirmationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionReadModels.RewardConfirmationReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns reward payment, receipt confirmation and dispute state transitions. */
@Service
public class SessionRewardService {

    private final SessionWorkflowRepository repository;
    private final SessionWorkflowAccessService accessService;
    private final AuditWriteService auditWriteService;
    private final SessionLifecycleNotificationService notificationService;

    public SessionRewardService(
            SessionWorkflowRepository repository,
            SessionWorkflowAccessService accessService,
            AuditWriteService auditWriteService,
            SessionLifecycleNotificationService notificationService
    ) {
        this.repository = repository;
        this.accessService = accessService;
        this.auditWriteService = auditWriteService;
        this.notificationService = notificationService;
    }

    @Transactional
    public RewardConfirmationReadModel markRewardPaid(UUID actorUserId, UUID sessionId) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = accessService.authorizeParticipant(user, context.application(), context.post());
        return markRewardPaid(context.session(), context.application(), context.post(), user.id(), actorRole);
    }

    @Transactional
    public RewardConfirmationReadModel markRewardPaid(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        SessionContext locked = requireLockedSessionContext(session.id());
        session = locked.session();
        application = locked.application();
        post = locked.post();
        ensureFounder(actorRole);
        ensureCompleted(session, "mark reward paid");

        RewardConfirmationRecord reward = getOrCreateReward(session, application, post);
        if (!Set.of("pending", "founder_marked_paid").contains(reward.status())) {
            throw conflict("Reward status has already changed");
        }
        Map<String, Object> before = serializeReward(reward);
        if ("pending".equals(reward.status())) {
            reward = repository.saveRewardConfirmation(new RewardConfirmationRecord(
                    reward.id(), reward.sessionId(), reward.applicationId(), reward.founderId(), reward.respondentId(),
                    reward.amount(), "founder_marked_paid", OffsetDateTime.now(ZoneOffset.UTC),
                    reward.respondentConfirmedAt(), reward.disputedAt(), reward.disputeReason(), reward.createdAt(), reward.updatedAt()
            ));
        }
        auditWriteService.record(new AuditEventCommand(
                actorUserId, "user", "reward_marked_paid", "reward_confirmation", reward.id(), before, serializeReward(reward), null,
                auditMetadata(application, post, session, actorRole)
        ));
        notificationService.notifyCounterpart(
                session, application, post, post.founderId(), "reward_marked_paid", "사례비 지급 확인이 필요해요",
                "창업자가 사례비 지급을 완료했다고 표시했어요. 수령 여부를 확인해 주세요.",
                Map.of("reward_id", reward.id().toString(), "actor_role", actorRole)
        );
        return toReadModel(reward);
    }

    @Transactional
    public RewardConfirmationReadModel confirmRewardReceived(UUID actorUserId, UUID sessionId) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = accessService.authorizeParticipant(user, context.application(), context.post());
        return confirmRewardReceived(context.session(), context.application(), context.post(), user.id(), actorRole);
    }

    @Transactional
    public RewardConfirmationReadModel confirmRewardReceived(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        SessionContext locked = requireLockedSessionContext(session.id());
        session = locked.session();
        application = locked.application();
        post = locked.post();
        ensureRespondent(actorRole);
        ensureCompleted(session, "confirm reward");
        RewardConfirmationRecord reward = repository.findRewardConfirmation(session.id())
                .orElseThrow(() -> conflict("Reward is not ready for confirmation"));
        if (!"founder_marked_paid".equals(reward.status())) {
            throw conflict("Reward is not ready for confirmation");
        }
        Map<String, Object> before = serializeReward(reward);
        RewardConfirmationRecord saved = repository.saveRewardConfirmation(new RewardConfirmationRecord(
                reward.id(), reward.sessionId(), reward.applicationId(), reward.founderId(), reward.respondentId(), reward.amount(),
                "respondent_confirmed", reward.founderMarkedPaidAt(), OffsetDateTime.now(ZoneOffset.UTC), reward.disputedAt(),
                reward.disputeReason(), reward.createdAt(), reward.updatedAt()
        ));
        auditWriteService.record(new AuditEventCommand(
                actorUserId, "user", "reward_received_confirmed", "reward_confirmation", saved.id(), before, serializeReward(saved), null,
                auditMetadata(application, post, session, actorRole)
        ));
        notificationService.notifyCounterpart(
                session, application, post, actorUserId, "reward_confirmed", "사례비 수령이 확인됐어요",
                "상대가 사례비 수령을 확인했어요. 후기를 남겨주세요.",
                Map.of("reward_id", saved.id().toString(), "actor_role", actorRole)
        );
        return toReadModel(saved);
    }

    @Transactional
    public RewardConfirmationReadModel disputeReward(UUID actorUserId, UUID sessionId, String reason) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = accessService.authorizeParticipant(user, context.application(), context.post());
        return disputeReward(context.session(), context.application(), context.post(), user.id(), actorRole, reason);
    }

    @Transactional
    public RewardConfirmationReadModel disputeReward(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole,
            String reason
    ) {
        SessionContext locked = requireLockedSessionContext(session.id());
        session = locked.session();
        application = locked.application();
        post = locked.post();
        ensureRespondent(actorRole);
        ensureCompleted(session, "dispute reward");
        RewardConfirmationRecord reward = repository.findRewardConfirmation(session.id())
                .orElseThrow(() -> conflict("Reward is not ready for dispute"));
        if (!"founder_marked_paid".equals(reward.status())) {
            throw conflict("Reward is not ready for dispute");
        }
        String normalizedReason = normalizeOptionalText(reason);
        Map<String, Object> before = serializeReward(reward);
        RewardConfirmationRecord saved = repository.saveRewardConfirmation(new RewardConfirmationRecord(
                reward.id(), reward.sessionId(), reward.applicationId(), reward.founderId(), reward.respondentId(), reward.amount(),
                "disputed", reward.founderMarkedPaidAt(), reward.respondentConfirmedAt(), OffsetDateTime.now(ZoneOffset.UTC),
                normalizedReason, reward.createdAt(), reward.updatedAt()
        ));
        auditWriteService.record(new AuditEventCommand(
                actorUserId, "user", "reward_disputed", "reward_confirmation", saved.id(), before, serializeReward(saved), normalizedReason,
                auditMetadata(application, post, session, actorRole)
        ));
        notificationService.notifyCounterpart(
                session, application, post, actorUserId, "reward_disputed", "사례비 확인 문제가 접수됐어요",
                "상대가 사례비 수령에 문제가 있다고 표시했어요. 채팅에서 확인해 주세요.",
                Map.of("reward_id", saved.id().toString(), "actor_role", actorRole)
        );
        return toReadModel(saved);
    }

    private SessionContext requireSessionContext(UUID sessionId) {
        SessionContext context = accessService.getSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
        ensureInterviewRecruitmentType(context.post(), "session workflow");
        return context;
    }

    private SessionContext requireLockedSessionContext(UUID sessionId) {
        SessionContext context = repository.lockSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
        ensureInterviewRecruitmentType(context.post(), "session workflow");
        return context;
    }

    private RewardConfirmationRecord getOrCreateReward(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
        return repository.findRewardConfirmation(session.id())
                .orElseGet(() -> repository.saveRewardConfirmation(new RewardConfirmationRecord(
                        UUID.randomUUID(), session.id(), application.id(), post.founderId(), application.respondentId(),
                        post.rewardAmount(), "pending", null, null, null, null, null, null
                )));
    }

    private Map<String, Object> serializeReward(RewardConfirmationRecord reward) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("status", reward.status());
        values.put("amount", reward.amount());
        values.put("founder_marked_paid_at", reward.founderMarkedPaidAt() == null ? null : reward.founderMarkedPaidAt().toString());
        values.put("respondent_confirmed_at", reward.respondentConfirmedAt() == null ? null : reward.respondentConfirmedAt().toString());
        values.put("disputed_at", reward.disputedAt() == null ? null : reward.disputedAt().toString());
        return values;
    }

    private Map<String, Object> auditMetadata(
            ApplicationRecord application,
            InterviewPostRecord post,
            InterviewSessionRecord session,
            String actorRole
    ) {
        return Map.of(
                "application_id", application.id().toString(),
                "interview_post_id", post.id().toString(),
                "session_id", session.id().toString(),
                "actor_role", actorRole
        );
    }

    private RewardConfirmationReadModel toReadModel(RewardConfirmationRecord reward) {
        return new RewardConfirmationReadModel(
                reward.id(), reward.sessionId(), reward.applicationId(), reward.founderId(), reward.respondentId(), reward.amount(),
                reward.status(), reward.founderMarkedPaidAt(), reward.respondentConfirmedAt(), reward.disputedAt(), reward.disputeReason(),
                reward.createdAt(), reward.updatedAt()
        );
    }

    private void ensureCompleted(InterviewSessionRecord session, String action) {
        if (!"completed".equals(session.status())) {
            throw badRequest("Only completed sessions can " + action);
        }
    }

    private void ensureFounder(String actorRole) {
        if (!"founder".equals(actorRole)) {
            throw forbidden("Interview post owner required");
        }
    }

    private void ensureRespondent(String actorRole) {
        if (!"respondent".equals(actorRole)) {
            throw forbidden("Application participant required");
        }
    }

    private void ensureInterviewRecruitmentType(InterviewPostRecord post, String action) {
        if (!"interview".equals(post.recruitmentType())) {
            throw new HypofitException(
                    "recruitment_type_action_not_allowed",
                    "이 모집 형식에서는 사용할 수 없는 기능이에요.",
                    HttpStatus.BAD_REQUEST.value(),
                    "Only interview recruitment supports " + action + ": " + post.recruitmentType()
            );
        }
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private HypofitException badRequest(String detail) {
        return new HypofitException(toCode(detail), detail, HttpStatus.BAD_REQUEST.value(), detail);
    }

    private HypofitException conflict(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
    }

    private HypofitException forbidden(String detail) {
        return new HypofitException("permission_denied", "권한이 없어요.", HttpStatus.FORBIDDEN.value(), detail);
    }

    private HypofitException notFound(String detail) {
        return new HypofitException("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), detail);
    }

    private String toCode(String detail) {
        String normalized = detail.chars()
                .mapToObj(character -> Character.isLetterOrDigit(character)
                        ? String.valueOf(Character.toLowerCase((char) character))
                        : "_")
                .reduce("", String::concat)
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
        return normalized.isBlank() ? "error" : normalized;
    }
}
