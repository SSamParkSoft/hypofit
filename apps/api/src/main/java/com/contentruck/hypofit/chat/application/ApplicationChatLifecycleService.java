package com.contentruck.hypofit.chat.application;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationChatLifecycleService {

    private final ChatRepository chatRepository;

    public ApplicationChatLifecycleService(ChatRepository chatRepository) {
        this.chatRepository = chatRepository;
    }

    @Transactional
    public void ensureRoomForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId
    ) {
        chatRepository.ensureRoomForApplication(applicationId, interviewPostId, founderId, respondentId);
    }

    @Transactional
    public void markSelectedForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId
    ) {
        chatRepository.markSelectedForApplication(applicationId, interviewPostId, founderId, respondentId);
    }

    @Transactional
    public void markRejectedForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId,
            String rejectionReason
    ) {
        chatRepository.markRejectedForApplication(
                applicationId,
                interviewPostId,
                founderId,
                respondentId,
                rejectionReason
        );
    }

    @Transactional
    public void markCanceledForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId
    ) {
        chatRepository.markCanceledForApplication(applicationId, interviewPostId, founderId, respondentId);
    }
}
