package com.contentruck.hypofit.push.application;

public interface PushProviderGateway {

    PushProviderResult sendPush(
            PushDispatchRepository.PushDeviceDispatchRecord device,
            PushDispatchRepository.NotificationDispatchRecord notification
    );

    record PushProviderResult(
            String status,
            String messageId,
            String errorCode,
            String errorMessage,
            boolean invalidToken
    ) {
        public static PushProviderResult sent(String messageId) {
            return new PushProviderResult("sent", messageId, null, null, false);
        }

        public static PushProviderResult skipped(String errorCode, String errorMessage) {
            return new PushProviderResult("skipped", null, errorCode, errorMessage, false);
        }

        public static PushProviderResult failed(String errorCode, String errorMessage) {
            return new PushProviderResult("failed", null, errorCode, errorMessage, false);
        }

        public static PushProviderResult invalid(String errorCode, String errorMessage) {
            return new PushProviderResult("invalid", null, errorCode, errorMessage, true);
        }
    }
}
