package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewReviewRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionReadModels.InterviewReviewReadModel;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates and reads one private review per participant after a completed session. */
@Service
public class SessionReviewService {

    private final SessionWorkflowRepository repository;
    private final SessionWorkflowAccessService accessService;
    private final AuditWriteService auditWriteService;
    private final SessionLifecycleNotificationService notificationService;

    public SessionReviewService(
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
    public InterviewReviewReadModel createReview(
            UUID actorUserId,
            UUID sessionId,
            int rating,
            List<String> tags,
            String comment
    ) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = accessService.authorizeParticipant(user, context.application(), context.post());
        return createReview(context.session(), context.application(), context.post(), user.id(), actorRole, rating, tags, comment);
    }

    @Transactional
    public InterviewReviewReadModel createReview(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole,
            int rating,
            List<String> tags,
            String comment
    ) {
        SessionContext locked = requireLockedSessionContext(session.id());
        session = locked.session();
        application = locked.application();
        post = locked.post();
        ensureCompleted(session);
        if (repository.findReview(session.id(), actorUserId).isPresent()) {
            throw conflict("Review already exists");
        }

        InterviewReviewRecord saved = repository.saveReview(new InterviewReviewRecord(
                UUID.randomUUID(),
                session.id(),
                actorUserId,
                "founder".equals(actorRole) ? application.respondentId() : post.founderId(),
                actorRole,
                rating,
                normalizeTags(tags),
                normalizeOptionalText(comment),
                "private",
                null,
                null
        ));
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "interview_review_created",
                "interview_review",
                saved.id(),
                null,
                Map.of(
                        "session_id", session.id().toString(),
                        "reviewer_role", actorRole,
                        "rating", rating,
                        "tags", saved.tags() == null ? List.of() : saved.tags()
                ),
                null,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString()
                )
        ));
        notificationService.notifyCounterpart(
                session,
                application,
                post,
                actorUserId,
                "review_received",
                "후기가 등록됐어요",
                "상대가 인터뷰 후기를 남겼어요.",
                Map.of("review_id", saved.id().toString(), "actor_role", actorRole)
        );
        return toReadModel(saved);
    }

    @Transactional(readOnly = true)
    public List<InterviewReviewReadModel> listReviews(UUID actorUserId, UUID sessionId) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        accessService.authorizeParticipant(user, context.application(), context.post());
        return listReviews(context.session());
    }

    @Transactional(readOnly = true)
    public List<InterviewReviewReadModel> listReviews(InterviewSessionRecord session) {
        return repository.listReviews(session.id()).stream().map(this::toReadModel).toList();
    }

    private SessionContext requireSessionContext(UUID sessionId) {
        SessionContext context = accessService.getSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
        ensureInterviewRecruitmentType(context.post());
        return context;
    }

    private SessionContext requireLockedSessionContext(UUID sessionId) {
        SessionContext context = repository.lockSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
        ensureInterviewRecruitmentType(context.post());
        return context;
    }

    private void ensureCompleted(InterviewSessionRecord session) {
        if (!"completed".equals(session.status())) {
            throw badRequest("Only completed sessions can review");
        }
    }

    private void ensureInterviewRecruitmentType(InterviewPostRecord post) {
        if (!"interview".equals(post.recruitmentType())) {
            throw new HypofitException(
                    "recruitment_type_action_not_allowed",
                    "이 모집 형식에서는 사용할 수 없는 기능이에요.",
                    HttpStatus.BAD_REQUEST.value(),
                    "Only interview recruitment supports session workflow: " + post.recruitmentType()
            );
        }
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        return tags.stream()
                .map(tag -> tag == null ? "" : tag.trim())
                .filter(tag -> !tag.isEmpty())
                .limit(6)
                .toList();
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private InterviewReviewReadModel toReadModel(InterviewReviewRecord review) {
        return new InterviewReviewReadModel(
                review.id(), review.sessionId(), review.reviewerId(), review.revieweeId(), review.reviewerRole(), review.rating(),
                review.tags() == null ? List.of() : review.tags(), review.comment(), review.visibility(), review.createdAt(), review.updatedAt()
        );
    }

    private HypofitException badRequest(String detail) {
        return new HypofitException(toCode(detail), detail, HttpStatus.BAD_REQUEST.value(), detail);
    }

    private HypofitException conflict(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
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
