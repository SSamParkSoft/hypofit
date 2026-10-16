package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionReadModels.ApplicationReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.InterviewSessionReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.UserSummary;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionQueryService {

    private final SessionWorkflowRepository repository;
    private final SessionWorkflowAccessService accessService;

    public SessionQueryService(
            SessionWorkflowRepository repository,
            SessionWorkflowAccessService accessService
    ) {
        this.repository = repository;
        this.accessService = accessService;
    }

    @Transactional(readOnly = true)
    public List<InterviewSessionReadModel> listSessions(UUID userId) {
        ActiveUser user = accessService.requireActiveUser(userId);
        return repository.listSessionRows(user.id())
                .stream()
                .map(row -> toSessionReadModel(row.session(), toApplicationReadModel(row.application(), row.respondent())))
                .toList();
    }

    private InterviewSessionReadModel toSessionReadModel(
            InterviewSessionRecord session,
            ApplicationReadModel application
    ) {
        return new InterviewSessionReadModel(
                session.id(),
                session.applicationId(),
                session.scheduledAt(),
                session.meetingType(),
                session.meetingUrl(),
                session.place(),
                session.status(),
                application
        );
    }

    private ApplicationReadModel toApplicationReadModel(
            ApplicationRecord application,
            UserSummary respondent
    ) {
        return new ApplicationReadModel(
                application.id(),
                application.interviewPostId(),
                application.answers() == null ? Map.of() : application.answers(),
                application.availableTimes() == null ? List.of() : application.availableTimes(),
                application.respondentId(),
                application.status(),
                application.rejectionReason(),
                respondent
        );
    }

}
