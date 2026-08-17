package com.contentruck.hypofit.chat.service;

import static org.mockito.Mockito.verify;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ApplicationChatLifecycleServiceTest {

    @Mock
    private ChatRepository chatRepository;

    private ApplicationChatLifecycleService service;

    @BeforeEach
    void setUp() {
        service = new ApplicationChatLifecycleService(chatRepository);
    }

    @Test
    void delegatesApplicationRoomLifecycleToChatRepository() {
        UUID applicationId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();

        service.ensureRoomForApplication(applicationId, interviewPostId, founderId, respondentId);
        service.markSelectedForApplication(applicationId, interviewPostId, founderId, respondentId);
        service.markRejectedForApplication(
                applicationId,
                interviewPostId,
                founderId,
                respondentId,
                "일정이 맞지 않아요"
        );
        service.markCanceledForApplication(applicationId, interviewPostId, founderId, respondentId);

        verify(chatRepository).ensureRoomForApplication(applicationId, interviewPostId, founderId, respondentId);
        verify(chatRepository).markSelectedForApplication(applicationId, interviewPostId, founderId, respondentId);
        verify(chatRepository).markRejectedForApplication(
                applicationId,
                interviewPostId,
                founderId,
                respondentId,
                "일정이 맞지 않아요"
        );
        verify(chatRepository).markCanceledForApplication(applicationId, interviewPostId, founderId, respondentId);
    }
}
