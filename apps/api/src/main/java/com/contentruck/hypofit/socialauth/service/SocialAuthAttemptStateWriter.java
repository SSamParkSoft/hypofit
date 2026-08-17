package com.contentruck.hypofit.socialauth.service;

import com.contentruck.hypofit.socialauth.entity.SocialAuthAttemptEntity;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
class SocialAuthAttemptStateWriter {

    private final EntityManager entityManager;

    SocialAuthAttemptStateWriter(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markExpired(UUID attemptId) {
        SocialAuthAttemptEntity attempt = entityManager.find(SocialAuthAttemptEntity.class, attemptId);
        if (attempt == null || "expired".equals(attempt.getStatus())) {
            return;
        }
        attempt.setStatus("expired");
    }
}
