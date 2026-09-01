package com.contentruck.hypofit.survey.service;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.user.service.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SurveyParticipationService {

    private static final String SURVEY_RECRUITMENT_TYPE = "survey";
    private static final String POST_OPEN_STATUS = "open";
    private static final String ENTRY_MODE_DIRECT = "direct";
    private static final String STATUS_OPENED = "opened";
    private static final String STATUS_SUBMITTED = "submitted";
    private static final String STATUS_CONFIRMED = "confirmed";
    private static final String STATUS_WITHDRAWN = "withdrawn";

    private final SurveyParticipationRepository repository;
    private final Clock clock;

    @Autowired
    public SurveyParticipationService(SurveyParticipationRepository repository) {
        this(repository, Clock.systemUTC());
    }

    SurveyParticipationService(SurveyParticipationRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public SurveyParticipationActionView open(UUID actorUserId, UUID postId) {
        requireActiveAccount(actorUserId);
        SurveyPostSummary post = requireSurveyPost(postId);
        ensureNotSelfParticipation(actorUserId, post);
        ensureExternalAccessAllowed(post, actorUserId);
        ensureExternalUrlConfigured(post);

        Optional<SurveyParticipationReadModel> existing = repository.findParticipationForUpdate(postId, actorUserId);
        SurveyParticipationReadModel participation;
        if (existing.isPresent()) {
            participation = switch (existing.get().status()) {
                case STATUS_OPENED, STATUS_SUBMITTED, STATUS_CONFIRMED -> existing.get();
                case STATUS_WITHDRAWN -> throw invalidState(
                        "Withdrawn survey participation cannot be opened again for post " + postId
                );
                default -> throw invalidState(
                        "Unsupported survey participation state for open: " + existing.get().status()
                );
            };
        } else {
            ensureSurveyAvailableForOpen(post);
            participation = repository.createOpenedParticipation(postId, actorUserId, now());
        }

        return new SurveyParticipationActionView(
                participation,
                resolveParticipant(actorUserId),
                post.externalUrl()
        );
    }

    @Transactional(readOnly = true)
    public Optional<SurveyParticipationView> findOwn(UUID actorUserId, UUID postId) {
        requireActiveAccount(actorUserId);
        SurveyPostSummary post = requireSurveyPost(postId);
        ensureNotSelfParticipation(actorUserId, post);

        return repository.findParticipation(postId, actorUserId)
                .map(participation -> new SurveyParticipationView(
                        participation,
                        resolveParticipant(actorUserId)
                ));
    }

    @Transactional
    public SurveyParticipationActionView submit(UUID actorUserId, UUID postId) {
        requireActiveAccount(actorUserId);
        SurveyPostSummary post = requireSurveyPost(postId);
        ensureNotSelfParticipation(actorUserId, post);

        SurveyParticipationReadModel existing = repository.findParticipationForUpdate(postId, actorUserId)
                .orElseThrow(() -> invalidState(
                        "Survey participation must be opened before submit for post " + postId
                ));

        SurveyParticipationReadModel participation = switch (existing.status()) {
            case STATUS_OPENED -> {
                ensureSurveyAvailableForOpen(post);
                yield repository.updateToSubmitted(postId, actorUserId, now());
            }
            case STATUS_SUBMITTED, STATUS_CONFIRMED -> existing;
            case STATUS_WITHDRAWN -> throw invalidState(
                    "Withdrawn survey participation cannot be submitted again for post " + postId
            );
            default -> throw invalidState(
                    "Unsupported survey participation state for submit: " + existing.status()
            );
        };

        return new SurveyParticipationActionView(
                participation,
                resolveParticipant(actorUserId),
                post.externalUrl()
        );
    }

    @Transactional
    public SurveyParticipationActionView withdraw(UUID actorUserId, UUID postId) {
        requireActiveAccount(actorUserId);
        SurveyPostSummary post = requireSurveyPost(postId);
        ensureNotSelfParticipation(actorUserId, post);

        SurveyParticipationReadModel existing = repository.findParticipationForUpdate(postId, actorUserId)
                .orElseThrow(() -> invalidState(
                        "Survey participation must be submitted before withdraw for post " + postId
                ));

        SurveyParticipationReadModel participation = switch (existing.status()) {
            case STATUS_SUBMITTED -> repository.updateToWithdrawn(postId, actorUserId, now());
            case STATUS_WITHDRAWN -> existing;
            case STATUS_OPENED, STATUS_CONFIRMED -> throw invalidState(
                    "Survey participation in state %s cannot be withdrawn".formatted(existing.status())
            );
            default -> throw invalidState(
                    "Unsupported survey participation state for withdraw: " + existing.status()
            );
        };

        return new SurveyParticipationActionView(
                participation,
                resolveParticipant(actorUserId),
                post.externalUrl()
        );
    }

    @Transactional
    public SurveyParticipationView confirm(UUID actorUserId, UUID postId, UUID participantId) {
        requireActiveAccount(actorUserId);
        SurveyPostSummary post = requireSurveyPost(postId);
        ensureOrganizer(actorUserId, post);

        SurveyParticipationReadModel existing = repository.findParticipationForUpdate(postId, participantId)
                .orElseThrow(() -> notFound(
                        "Survey participation not found for post %s and participant %s".formatted(postId, participantId)
                ));

        SurveyParticipationReadModel participation = switch (existing.status()) {
            case STATUS_SUBMITTED -> repository.updateToConfirmed(postId, participantId, now());
            case STATUS_CONFIRMED -> existing;
            case STATUS_OPENED, STATUS_WITHDRAWN -> throw invalidState(
                    "Survey participation in state %s cannot be confirmed".formatted(existing.status())
            );
            default -> throw invalidState(
                    "Unsupported survey participation state for confirm: " + existing.status()
            );
        };

        return new SurveyParticipationView(participation, resolveParticipant(participantId));
    }

    @Transactional(readOnly = true)
    public List<SurveyParticipationView> listParticipants(UUID actorUserId, UUID postId) {
        requireActiveAccount(actorUserId);
        SurveyPostSummary post = requireSurveyPost(postId);
        ensureOrganizer(actorUserId, post);

        List<SurveyParticipationReadModel> participations = repository.listParticipations(postId);
        Map<UUID, SurveyParticipantSummary> participants = resolveParticipants(
                participations.stream().map(SurveyParticipationReadModel::participantId).toList()
        );

        return participations.stream()
                .map(participation -> new SurveyParticipationView(
                        participation,
                        participants.getOrDefault(
                                participation.participantId(),
                                new SurveyParticipantSummary(participation.participantId(), null, null, null)
                        )
                ))
                .toList();
    }

    private SurveyActorAccount requireActiveAccount(UUID actorUserId) {
        SurveyActorAccount account = repository.findUserAccount(actorUserId)
                .orElseThrow(UserProfileMissingException::new);
        if (account.deleted()) {
            throw new UserAccountDeletedException();
        }
        if (account.deactivated()) {
            throw new UserAccountDeactivatedException();
        }
        return account;
    }

    private SurveyPostSummary requireSurveyPost(UUID postId) {
        SurveyPostSummary post = repository.findPost(postId)
                .orElseThrow(() -> notFound("Survey interview post not found: " + postId));
        if (!SURVEY_RECRUITMENT_TYPE.equals(post.recruitmentType())) {
            throw actionNotAllowed(
                    "Survey routes are only allowed for survey posts: %s".formatted(post.recruitmentType())
            );
        }
        return post;
    }

    private void ensureNotSelfParticipation(UUID actorUserId, SurveyPostSummary post) {
        if (post.founderId().equals(actorUserId)) {
            throw new HypofitException(
                    "self_participation_forbidden",
                    "내가 만든 설문에는 참여할 수 없어요.",
                    HttpStatus.FORBIDDEN.value(),
                    "Self participation forbidden for survey post " + post.id()
            );
        }
    }

    private void ensureOrganizer(UUID actorUserId, SurveyPostSummary post) {
        if (!post.founderId().equals(actorUserId)) {
            throw new HypofitException(
                    "permission_denied",
                    "권한이 없어요.",
                    HttpStatus.FORBIDDEN.value(),
                    "Survey organizer permission required for post " + post.id()
            );
        }
    }

    private void ensureSurveyAvailableForOpen(SurveyPostSummary post) {
        if (!POST_OPEN_STATUS.equals(post.status())) {
            throw surveyNotAvailable("Survey post is not open: " + post.id() + " status=" + post.status());
        }
        OffsetDateTime deadline = post.participationDeadlineAt();
        if (deadline != null && deadline.isBefore(now())) {
            throw surveyNotAvailable("Survey participation deadline has passed for post " + post.id());
        }
    }

    private void ensureExternalUrlConfigured(SurveyPostSummary post) {
        if (post.externalUrl() == null || post.externalUrl().isBlank()) {
            throw new HypofitException(
                    "survey_link_unavailable",
                    "설문 링크가 아직 준비되지 않았어요.",
                    HttpStatus.CONFLICT.value(),
                    "Survey post has no external URL: " + post.id()
            );
        }
    }

    private void ensureExternalAccessAllowed(SurveyPostSummary post, UUID actorUserId) {
        if (ENTRY_MODE_DIRECT.equals(post.entryMode())) {
            return;
        }
        if (!repository.hasSelectedApplication(post.id(), actorUserId)) {
            throw new HypofitException(
                    "survey_access_not_granted",
                    "모집자가 신청 내용을 확인한 뒤 설문에 참여할 수 있어요.",
                    HttpStatus.FORBIDDEN.value(),
                    "Application-required survey access denied for post " + post.id()
            );
        }
    }

    private SurveyParticipantSummary resolveParticipant(UUID participantId) {
        return resolveParticipants(List.of(participantId))
                .getOrDefault(participantId, new SurveyParticipantSummary(participantId, null, null, null));
    }

    private Map<UUID, SurveyParticipantSummary> resolveParticipants(Collection<UUID> participantIds) {
        if (participantIds.isEmpty()) {
            return Map.of();
        }
        return new LinkedHashMap<>(repository.findParticipantSummaries(participantIds));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC);
    }

    private HypofitException actionNotAllowed(String debugMessage) {
        return new HypofitException(
                "recruitment_type_action_not_allowed",
                "이 모집 형식에서는 할 수 없는 작업이에요.",
                HttpStatus.CONFLICT.value(),
                debugMessage
        );
    }

    private HypofitException surveyNotAvailable(String debugMessage) {
        return new HypofitException(
                "survey_not_available",
                "지금은 이 설문에 참여할 수 없어요.",
                HttpStatus.CONFLICT.value(),
                debugMessage
        );
    }

    private HypofitException invalidState(String debugMessage) {
        return new HypofitException(
                "survey_participation_invalid_state",
                "현재 상태에서는 이 작업을 할 수 없어요.",
                HttpStatus.CONFLICT.value(),
                debugMessage
        );
    }

    private HypofitException notFound(String debugMessage) {
        return new HypofitException(
                "not_found",
                "요청한 정보를 찾지 못했어요.",
                HttpStatus.NOT_FOUND.value(),
                debugMessage
        );
    }
}
