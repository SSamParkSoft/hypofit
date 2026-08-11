package com.contentruck.hypofit.push.application;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PushDispatchService {

    private static final Logger logger = LoggerFactory.getLogger(PushDispatchService.class);

    private final PushDispatchRepository repository;
    private final PushProviderGateway pushProviderGateway;
    private final HypofitProperties properties;
    private final TransactionOperations transactionOperations;

    @Autowired
    public PushDispatchService(
            PushDispatchRepository repository,
            PushProviderGateway pushProviderGateway,
            HypofitProperties properties,
            PlatformTransactionManager transactionManager
    ) {
        this(repository, pushProviderGateway, properties, new TransactionTemplate(transactionManager));
    }

    PushDispatchService(
            PushDispatchRepository repository,
            PushProviderGateway pushProviderGateway,
            HypofitProperties properties,
            TransactionOperations transactionOperations
    ) {
        this.repository = repository;
        this.pushProviderGateway = pushProviderGateway;
        this.properties = properties;
        this.transactionOperations = transactionOperations;
    }

    public PushDispatchResult dispatchPendingDeliveries(Integer limitOverride) {
        if (!properties.getPush().isEnabled()) {
            return PushDispatchResult.zero();
        }

        int limit = limitOverride == null ? properties.getPush().getPushBatchSize() : limitOverride;
        List<PushDispatchRepository.ClaimedPushDeliveryRecord> claimed = transactionOperations.execute(status -> {
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            repository.resetStaleSendingDeliveries(
                    now,
                    properties.getPush().getPushSendingTimeoutSeconds(),
                    properties.getPush().getPushMaxAttempts()
            );
            return repository.claimPendingDeliveries(now, limit);
        });

        if (claimed == null || claimed.isEmpty()) {
            return PushDispatchResult.zero();
        }

        int sent = 0;
        int failed = 0;
        int invalid = 0;
        int skipped = 0;
        List<DeliveryOutcome> outcomes = new ArrayList<>(claimed.size());

        for (PushDispatchRepository.ClaimedPushDeliveryRecord delivery : claimed) {
            PushProviderGateway.PushProviderResult result = send(delivery);
            String status = normalizeStatus(result.status());
            if ("sent".equals(status)) {
                sent += 1;
            } else if (result.invalidToken() || "invalid".equals(status)) {
                invalid += 1;
            } else if ("skipped".equals(status)) {
                skipped += 1;
            } else {
                failed += 1;
            }
            outcomes.add(new DeliveryOutcome(
                    delivery.deliveryId(),
                    delivery.device().id(),
                    delivery.attemptCount(),
                    status,
                    result.messageId(),
                    result.errorCode(),
                    result.errorMessage(),
                    result.invalidToken()
            ));
        }

        transactionOperations.execute(status -> {
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            for (DeliveryOutcome outcome : outcomes) {
                applyOutcome(now, outcome);
            }
            return null;
        });

        return new PushDispatchResult(claimed.size(), sent, failed, invalid, skipped);
    }

    private PushProviderGateway.PushProviderResult send(PushDispatchRepository.ClaimedPushDeliveryRecord delivery) {
        try {
            return pushProviderGateway.sendPush(delivery.device(), delivery.notification());
        } catch (Exception exception) {
            String code = exception instanceof PushProviderException pushProviderException
                    ? pushProviderException.getCode()
                    : "push_send_error";
            logger.warn(
                    "push_dispatch_provider_exception delivery_id={} push_device_id={} provider={} notification_type={} error_code={}",
                    delivery.deliveryId(),
                    delivery.device().id(),
                    delivery.device().provider(),
                    delivery.notification().type(),
                    code,
                    exception
            );
            return PushProviderGateway.PushProviderResult.failed(code, exception.getMessage());
        }
    }

    private void applyOutcome(OffsetDateTime now, DeliveryOutcome outcome) {
        switch (outcome.status()) {
            case "sent" -> repository.markDeliverySent(
                    now,
                    outcome.deliveryId(),
                    outcome.pushDeviceId(),
                    outcome.providerMessageId(),
                    outcome.status()
            );
            case "invalid" -> repository.markDeliveryInvalid(
                    now,
                    outcome.deliveryId(),
                    outcome.pushDeviceId(),
                    outcome.status(),
                    outcome.errorCode(),
                    outcome.errorMessage()
            );
            case "skipped" -> repository.markDeliverySkipped(
                    now,
                    outcome.deliveryId(),
                    outcome.status(),
                    blankToDefault(outcome.errorCode(), "push_skipped"),
                    blankToDefault(outcome.errorMessage(), "Push provider skipped delivery")
            );
            default -> repository.markDeliveryFailed(
                    now,
                    outcome.deliveryId(),
                    outcome.pushDeviceId(),
                    outcome.attemptCount(),
                    outcome.status(),
                    outcome.errorCode(),
                    outcome.errorMessage(),
                    properties.getPush().getPushMaxAttempts()
            );
        }
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "failed";
        }
        return status;
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    record DeliveryOutcome(
            UUID deliveryId,
            UUID pushDeviceId,
            int attemptCount,
            String status,
            String providerMessageId,
            String errorCode,
            String errorMessage,
            boolean invalidToken
    ) {
    }

    public record PushDispatchResult(
            int processed,
            int sent,
            int failed,
            int invalid,
            int skipped
    ) {
        static PushDispatchResult zero() {
            return new PushDispatchResult(0, 0, 0, 0, 0);
        }
    }
}
