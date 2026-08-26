package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionContexts.StoredUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Active-account checks, context lookup and participant authorization for session workflows. */
@Service
public class SessionWorkflowAccessService {

    private final SessionWorkflowRepository repository;

    public SessionWorkflowAccessService(SessionWorkflowRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public ActiveUser requireActiveUser(UUID userId) {
        StoredUser user = repository.findUserById(userId)
                .orElseThrow(() -> forbidden("profile_missing", "프로필 설정이 필요해요.", "Hypofit profile is required"));
        if (user.deletedAt() != null) {
            throw forbidden("account_deleted", "삭제된 계정이에요.", "Account is inactive");
        }
        if (user.deactivatedAt() != null) {
            throw forbidden("account_deactivated", "비활성화된 계정이에요.", "Account is inactive");
        }
        return new ActiveUser(user.id(), user.role());
    }

    @Transactional(readOnly = true)
    public Optional<ApplicationContext> getApplicationContext(UUID applicationId) {
        return repository.findApplicationContext(applicationId);
    }

    @Transactional(readOnly = true)
    public Optional<SessionContext> getSessionContext(UUID sessionId) {
        return repository.findSessionContext(sessionId);
    }

    public String authorizeParticipant(
            ActiveUser user,
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
        ensureInterviewRecruitmentType(post, "session workflow");
        if (post.founderId().equals(user.id())) {
            return "founder";
        }
        if (application.respondentId().equals(user.id())) {
            return "respondent";
        }
        throw new HypofitException("permission_denied", "권한이 없어요.", HttpStatus.FORBIDDEN.value(), "Forbidden");
    }

    private void ensureInterviewRecruitmentType(InterviewPostRecord post, String action) {
        if ("interview".equals(post.recruitmentType())) {
            return;
        }
        throw new HypofitException(
                "recruitment_type_action_not_allowed",
                "이 모집 형식에서는 사용할 수 없는 기능이에요.",
                HttpStatus.BAD_REQUEST.value(),
                "Only interview recruitment supports " + action + ": " + post.recruitmentType()
        );
    }

    private HypofitException forbidden(String code, String message, String detail) {
        return new HypofitException(code, message, HttpStatus.FORBIDDEN.value(), detail);
    }
}
