package com.contentruck.hypofit.applicant.service;

import com.contentruck.hypofit.common.error.HypofitException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;
import java.util.UUID;

public final class ApplicationSharingConsent {
    public static final String REVISION = "2026-10-16.application-sharing.v1";
    public static final String PURPOSE = "지원자 검토·선정과 참여 진행";
    public static final String FIELDS = "이름, 프로필 사진, 한줄소개, 계정 역할, 사용자 식별자, 제출 답변, 가능한 시간";
    public static final String RETENTION = "검토·참여·보상 이행 목적 달성 시까지 보관합니다. "
            + "참여 이력 확인이나 구체적인 문의 대응에 필요한 경우에도 지원·참여 종료 후 최대 90일이며, "
            + "목적 달성·적법한 삭제 요청·동의 철회 시 먼저 삭제합니다. "
            + "별도 법령 또는 진행 중인 분쟁에 필요한 자료는 그 근거·대상·기간을 구분해 보존합니다.";
    public static final String REFUSAL = "동의를 거부해도 공고를 탐색할 수 있지만 해당 신청서는 제출할 수 없습니다.";
    private static final Set<String> SOURCES = Set.of("web_application", "ios_application", "android_application");
    private static final Set<String> REQUEST_FIELDS = Set.of("revision", "recipient_id", "accepted", "source");

    private ApplicationSharingConsent() {
    }

    public static void validate(JsonNode consent, UUID recipientId, boolean required) {
        if (consent == null) {
            if (required) {
                throw new HypofitException("application_sharing_consent_required", "모집자 제공 동의가 필요합니다.", 422, null);
            }
            return;
        }
        if (!consent.isObject() || hasUnknownFields(consent)
                || !REVISION.equals(consent.path("revision").textValue())
                || !recipientId.toString().equalsIgnoreCase(consent.path("recipient_id").textValue())
                || !consent.path("accepted").isBoolean() || !consent.path("accepted").booleanValue()
                || !consent.path("source").isTextual() || !SOURCES.contains(consent.path("source").textValue())) {
            throw new HypofitException("application_sharing_consent_invalid", "모집자 제공 동의 내용을 확인해 주세요.", 422, null);
        }
    }

    private static boolean hasUnknownFields(JsonNode consent) {
        var names = consent.fieldNames();
        while (names.hasNext()) {
            if (!REQUEST_FIELDS.contains(names.next())) {
                return true;
            }
        }
        return false;
    }
}
