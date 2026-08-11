package com.contentruck.hypofit.push.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionOperations;

@ExtendWith(MockitoExtension.class)
class PushDispatchServiceTest {

    @Mock
    private PushDispatchRepository repository;

    @Mock
    private PushProviderGateway pushProviderGateway;

    private HypofitProperties properties;
    private RecordingTransactionOperations transactionOperations;
    private PushDispatchService service;

    @BeforeEach
    void setUp() {
        properties = new HypofitProperties();
        properties.getPush().setEnabled(true);
        properties.getPush().setPushBatchSize(10);
        properties.getPush().setPushMaxAttempts(3);
        properties.getPush().setPushSendingTimeoutSeconds(300);
        transactionOperations = new RecordingTransactionOperations();
        service = new PushDispatchService(repository, pushProviderGateway, properties, transactionOperations);
    }

    @Test
    void returnsZeroWhenPushIsDisabled() {
        properties.getPush().setEnabled(false);

        PushDispatchService.PushDispatchResult result = service.dispatchPendingDeliveries(null);

        assertThat(result).isEqualTo(new PushDispatchService.PushDispatchResult(0, 0, 0, 0, 0));
        verify(repository, never()).resetStaleSendingDeliveries(any(), anyInt(), anyInt());
        verify(pushProviderGateway, never()).sendPush(any(), any());
    }

    @Test
    void claimsAndCommitsBeforeProviderSendThenMarksSent() {
        List<String> events = new ArrayList<>();
        PushDispatchRepository.ClaimedPushDeliveryRecord claimed = claimedDelivery("chat_message", 1);

        when(repository.resetStaleSendingDeliveries(any(), anyInt(), anyInt())).thenAnswer(invocation -> {
            events.add("reset");
            return 0;
        });
        when(repository.claimPendingDeliveries(any(), anyInt())).thenAnswer(invocation -> {
            events.add("claim");
            return List.of(claimed);
        });
        when(pushProviderGateway.sendPush(claimed.device(), claimed.notification())).thenAnswer(invocation -> {
            events.add("send");
            return PushProviderGateway.PushProviderResult.sent("provider-message-1");
        });

        PushDispatchService.PushDispatchResult result = service.dispatchPendingDeliveries(3);

        assertThat(result).isEqualTo(new PushDispatchService.PushDispatchResult(1, 1, 0, 0, 0));
        assertThat(events).containsExactly("reset", "claim", "send");
        assertThat(transactionOperations.executionCount()).isEqualTo(2);
        verify(repository).markDeliverySent(any(), any(), any(), org.mockito.ArgumentMatchers.eq("provider-message-1"), org.mockito.ArgumentMatchers.eq("sent"));
    }

    @Test
    void mapsProviderStatusesIntoTerminalAndRetryStates() {
        PushDispatchRepository.ClaimedPushDeliveryRecord invalid = claimedDelivery("application_selected", 1);
        PushDispatchRepository.ClaimedPushDeliveryRecord skipped = claimedDelivery("support_replied", 1);
        PushDispatchRepository.ClaimedPushDeliveryRecord failed = claimedDelivery("session_completed", 2);
        PushDispatchRepository.ClaimedPushDeliveryRecord exploded = claimedDelivery("chat_message", 1);

        when(repository.claimPendingDeliveries(any(), anyInt())).thenReturn(List.of(invalid, skipped, failed, exploded));
        when(pushProviderGateway.sendPush(invalid.device(), invalid.notification()))
                .thenReturn(PushProviderGateway.PushProviderResult.invalid("UNREGISTERED", "invalid token"));
        when(pushProviderGateway.sendPush(skipped.device(), skipped.notification()))
                .thenReturn(PushProviderGateway.PushProviderResult.skipped("apns_disabled", null));
        when(pushProviderGateway.sendPush(failed.device(), failed.notification()))
                .thenReturn(PushProviderGateway.PushProviderResult.failed("fcm_failed", "provider failed"));
        when(pushProviderGateway.sendPush(exploded.device(), exploded.notification()))
                .thenThrow(new PushProviderException("boom", "push_send_error"));

        PushDispatchService.PushDispatchResult result = service.dispatchPendingDeliveries(null);

        assertThat(result).isEqualTo(new PushDispatchService.PushDispatchResult(4, 0, 2, 1, 1));
        verify(repository).markDeliveryInvalid(any(), org.mockito.ArgumentMatchers.eq(invalid.deliveryId()), org.mockito.ArgumentMatchers.eq(invalid.device().id()), org.mockito.ArgumentMatchers.eq("invalid"), org.mockito.ArgumentMatchers.eq("UNREGISTERED"), org.mockito.ArgumentMatchers.eq("invalid token"));
        verify(repository).markDeliverySkipped(any(), org.mockito.ArgumentMatchers.eq(skipped.deliveryId()), org.mockito.ArgumentMatchers.eq("skipped"), org.mockito.ArgumentMatchers.eq("apns_disabled"), org.mockito.ArgumentMatchers.eq("Push provider skipped delivery"));
        verify(repository).markDeliveryFailed(any(), org.mockito.ArgumentMatchers.eq(failed.deliveryId()), org.mockito.ArgumentMatchers.eq(failed.device().id()), org.mockito.ArgumentMatchers.eq(2), org.mockito.ArgumentMatchers.eq("failed"), org.mockito.ArgumentMatchers.eq("fcm_failed"), org.mockito.ArgumentMatchers.eq("provider failed"), org.mockito.ArgumentMatchers.eq(3));
        verify(repository).markDeliveryFailed(any(), org.mockito.ArgumentMatchers.eq(exploded.deliveryId()), org.mockito.ArgumentMatchers.eq(exploded.device().id()), org.mockito.ArgumentMatchers.eq(1), org.mockito.ArgumentMatchers.eq("failed"), org.mockito.ArgumentMatchers.eq("push_send_error"), org.mockito.ArgumentMatchers.eq("boom"), org.mockito.ArgumentMatchers.eq(3));
    }

    private PushDispatchRepository.ClaimedPushDeliveryRecord claimedDelivery(String type, int attemptCount) {
        UUID deliveryId = UUID.randomUUID();
        UUID deviceId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        return new PushDispatchRepository.ClaimedPushDeliveryRecord(
                deliveryId,
                attemptCount,
                new PushDispatchRepository.PushDeviceDispatchRecord(
                        deviceId,
                        "fcm",
                        "production",
                        "device-token",
                        "aaaaaaaaaaaa"
                ),
                new PushDispatchRepository.NotificationDispatchRecord(
                        notificationId,
                        UUID.randomUUID(),
                        type,
                        "title",
                        "body",
                        "chat_room",
                        UUID.randomUUID(),
                        new LinkedHashMap<>(Map.of("sender_name", "세현", "interview_title", "중고거래 약속 조율 인터뷰"))
                )
        );
    }

    private static final class RecordingTransactionOperations implements TransactionOperations {

        private int executionCount = 0;

        @Override
        public <T> T execute(TransactionCallback<T> action) {
            executionCount += 1;
            TransactionStatus status = new SimpleTransactionStatus();
            return action.doInTransaction(status);
        }

        int executionCount() {
            return executionCount;
        }
    }
}
