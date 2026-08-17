package com.contentruck.hypofit.push.client;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.push.service.PushDispatchRepository;
import com.contentruck.hypofit.push.service.PushProviderException;
import com.contentruck.hypofit.push.service.PushProviderGateway;
import com.contentruck.hypofit.push.service.PushProviderGateway.PushProviderResult;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class HttpPushProviderGateway implements PushProviderGateway {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final HypofitProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public HttpPushProviderGateway(
            HypofitProperties properties,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .version(HttpClient.Version.HTTP_2)
                .build();
    }

    @Override
    public PushProviderResult sendPush(
            PushDispatchRepository.PushDeviceDispatchRecord device,
            PushDispatchRepository.NotificationDispatchRecord notification
    ) {
        return switch (device.provider()) {
            case "apns" -> sendApns(device, notification);
            case "fcm" -> sendFcm(device, notification);
            default -> PushProviderResult.skipped(
                    "unsupported_provider",
                    "Unsupported push provider for device " + device.id()
            );
        };
    }

    private PushProviderResult sendApns(
            PushDispatchRepository.PushDeviceDispatchRecord device,
            PushDispatchRepository.NotificationDispatchRecord notification
    ) {
        if (!properties.getPush().isPushApnsEnabled()) {
            return PushProviderResult.skipped("apns_disabled", null);
        }
        if (blank(properties.getPush().getPushApnsBundleId())) {
            throw new PushProviderException("APNs bundle id is missing", "apns_topic_missing");
        }

        String[] copy = buildPushCopy(notification);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("aps", Map.of(
                "alert", Map.of("title", copy[0], "body", copy[1]),
                "sound", "default"
        ));
        payload.putAll(buildPushData(notification));

        HttpRequest request = requestBuilder(apnsEndpoint(device.environment(), device.token()))
                .header("authorization", "bearer " + createApnsJwt())
                .header("apns-topic", properties.getPush().getPushApnsBundleId())
                .header("apns-push-type", "alert")
                .header("apns-priority", "10")
                .POST(jsonBody(payload))
                .build();

        HttpResponse<String> response = send(request);
        String apnsId = response.headers().firstValue("apns-id").orElse(null);
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            return PushProviderResult.sent(apnsId);
        }

        Map<String, Object> bodyJson = readJsonObject(response.body());
        String reason = stringValue(bodyJson.get("reason"));
        if (blank(reason)) {
            reason = !blank(response.body()) ? response.body() : "apns_" + response.statusCode();
        }
        boolean invalid = "BadDeviceToken".equals(reason)
                || "DeviceTokenNotForTopic".equals(reason)
                || "Unregistered".equals(reason);
        return new PushProviderResult(
                invalid ? "invalid" : "failed",
                apnsId,
                reason,
                "APNs returned " + response.statusCode(),
                invalid
        );
    }

    private PushProviderResult sendFcm(
            PushDispatchRepository.PushDeviceDispatchRecord device,
            PushDispatchRepository.NotificationDispatchRecord notification
    ) {
        if (!properties.getPush().isPushFcmEnabled()) {
            return PushProviderResult.skipped("fcm_disabled", null);
        }
        if (blank(properties.getPush().getPushFcmProjectId())) {
            throw new PushProviderException("FCM project id is missing", "fcm_project_missing");
        }

        String[] copy = buildPushCopy(notification);
        Map<String, Object> message = Map.of(
                "message", Map.of(
                        "token", device.token(),
                        "notification", Map.of("title", copy[0], "body", copy[1]),
                        "data", buildPushData(notification),
                        "android", Map.of(
                                "priority", "HIGH",
                                "notification", Map.of(
                                        "channel_id", "hypofit-workflow",
                                        "default_sound", true
                                )
                        )
                )
        );
        HttpRequest request = requestBuilder(
                "https://fcm.googleapis.com/v1/projects/"
                        + properties.getPush().getPushFcmProjectId()
                        + "/messages:send"
        )
                .header("authorization", "Bearer " + getFcmAccessToken())
                .POST(jsonBody(message))
                .build();

        HttpResponse<String> response = send(request);
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            Map<String, Object> bodyJson = readJsonObject(response.body());
            String name = stringValue(bodyJson.get("name"));
            return PushProviderResult.sent(blank(name) ? null : name);
        }

        Map<String, Object> bodyJson = readJsonObject(response.body());
        Map<String, Object> error = childMap(bodyJson.get("error"));
        String code = stringValue(error.get("status"));
        if (blank(code)) {
            code = stringValue(error.get("code"));
        }
        if (blank(code)) {
            code = "fcm_failed";
        }
        String messageText = stringValue(error.get("message"));
        if (blank(messageText)) {
            messageText = response.body();
        }
        boolean invalid = "NOT_FOUND".equals(code)
                || "INVALID_ARGUMENT".equals(code)
                || "UNREGISTERED".equals(code);
        return new PushProviderResult(
                invalid ? "invalid" : "failed",
                null,
                code,
                messageText,
                invalid
        );
    }

    private String[] buildPushCopy(PushDispatchRepository.NotificationDispatchRecord notification) {
        String interview = interviewLabel(notification);
        return switch (notification.type()) {
            case "chat_message" -> {
                String sender = personLabel(notification, "sender_name");
                yield new String[]{
                        sender == null ? "새 메시지가 왔어요" : sender + "님이 메시지를 보냈어요",
                        interview + " 일정 조율을 이어가 보세요."
                };
            }
            case "application_created" -> new String[]{"새 인터뷰 신청이 도착했어요", interview + "에 지원자가 있어요."};
            case "application_selected" -> new String[]{"인터뷰에 선정됐어요", interview + " 일정을 조율해 주세요."};
            case "application_rejected" -> new String[]{"신청 결과가 도착했어요", interview + "는 이번에 진행되지 않아요."};
            case "attendance_confirmation_requested" -> new String[]{"만남 확인이 필요해요", interview + " 진행 여부를 확인해 주세요."};
            case "session_rescheduled" -> new String[]{"인터뷰 일정이 변경됐어요", interview + "의 변경된 시간을 확인해 주세요."};
            case "session_canceled" -> new String[]{"인터뷰가 취소됐어요", interview + " 채팅방에서 자세한 내용을 확인해 주세요."};
            case "session_completed" -> new String[]{"인터뷰가 완료됐어요", interview + " 사례비 확인과 후기를 이어가 보세요."};
            case "reward_marked_paid" -> new String[]{"사례비 지급 확인이 필요해요", interview + " 사례비 수령 여부를 확인해 주세요."};
            case "reward_confirmed" -> new String[]{"사례비 수령이 확인됐어요", interview + " 후기를 남겨주세요."};
            case "reward_disputed" -> new String[]{"사례비 확인 문제가 접수됐어요", interview + " 채팅에서 상황을 확인해 주세요."};
            case "review_received" -> new String[]{"후기가 등록됐어요", interview + " 진행 기록을 확인해 주세요."};
            case "no_show_marked" -> new String[]{"인터뷰 상태가 변경됐어요", interview + " 참여 기록을 확인해 주세요."};
            case "support_replied" -> new String[]{"문의 답변이 도착했어요", "운영팀 답변을 확인해 주세요."};
            default -> new String[]{notification.title(), "Hypofit에서 새 소식이 있어요."};
        };
    }

    private Map<String, String> buildPushData(PushDispatchRepository.NotificationDispatchRecord notification) {
        Map<String, String> data = new LinkedHashMap<>();
        data.put("notification_id", notification.id().toString());
        data.put("type", notification.type());
        if (notification.targetType() != null) {
            data.put("target_type", notification.targetType());
        }
        if (notification.targetId() != null) {
            data.put("target_id", notification.targetId().toString());
        }
        return data;
    }

    private String interviewLabel(PushDispatchRepository.NotificationDispatchRecord notification) {
        String title = metadataText(notification, "interview_title");
        return title == null ? "인터뷰" : shortText(title, 26);
    }

    private String personLabel(PushDispatchRepository.NotificationDispatchRecord notification, String key) {
        String value = metadataText(notification, key);
        return value == null ? null : shortText(value, 10);
    }

    private String metadataText(PushDispatchRepository.NotificationDispatchRecord notification, String key) {
        Object value = notification.metadata() == null ? null : notification.metadata().get(key);
        if (!(value instanceof String stringValue)) {
            return null;
        }
        String normalized = String.join(" ", stringValue.trim().split("\\s+"));
        return normalized.isBlank() ? null : normalized;
    }

    private String shortText(String value, int maxLength) {
        String normalized = String.join(" ", value.trim().split("\\s+"));
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, maxLength - 1).stripTrailing() + "…";
    }

    private String createApnsJwt() {
        String privateKey = readFile(properties.getPush().getPushApnsPrivateKeyPath(), "apns_private_key");
        if (blank(properties.getPush().getPushApnsTeamId()) || blank(properties.getPush().getPushApnsKeyId())) {
            throw new PushProviderException("APNs team id or key id is missing", "apns_config_missing");
        }
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.ES256)
                            .type(JOSEObjectType.JWT)
                            .keyID(properties.getPush().getPushApnsKeyId())
                            .build(),
                    new JWTClaimsSet.Builder()
                            .issuer(properties.getPush().getPushApnsTeamId())
                            .issueTime(new Date())
                            .build()
            );
            jwt.sign(new ECDSASigner(parseEcPrivateKey(privateKey)));
            return jwt.serialize();
        } catch (JOSEException exception) {
            throw new PushProviderException("APNs JWT signing failed", "apns_jwt_sign_failed");
        }
    }

    private String getFcmAccessToken() {
        Map<String, String> account = loadFcmServiceAccount();
        String clientEmail = account.get("client_email");
        String privateKey = account.get("private_key");
        String tokenUri = account.getOrDefault("token_uri", "https://oauth2.googleapis.com/token");
        if (blank(clientEmail) || blank(privateKey)) {
            throw new PushProviderException(
                    "FCM service account is missing client_email/private_key",
                    "fcm_config_missing"
            );
        }

        String assertion = signGoogleAssertion(clientEmail, privateKey, tokenUri);
        HttpRequest request = requestBuilder(tokenUri)
                .header("content-type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion="
                                + urlEncode(assertion)
                ))
                .build();
        HttpResponse<String> response = send(request);
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new PushProviderException("FCM OAuth token request failed", "fcm_oauth_failed");
        }
        Map<String, Object> bodyJson = readJsonObject(response.body());
        String token = stringValue(bodyJson.get("access_token"));
        if (blank(token)) {
            throw new PushProviderException(
                    "FCM OAuth response did not include access token",
                    "fcm_oauth_invalid"
            );
        }
        return token;
    }

    private String signGoogleAssertion(String clientEmail, String privateKey, String tokenUri) {
        Instant now = Instant.now();
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256).type(JOSEObjectType.JWT).build(),
                    new JWTClaimsSet.Builder()
                            .issuer(clientEmail)
                            .audience(tokenUri)
                            .claim("scope", "https://www.googleapis.com/auth/firebase.messaging")
                            .issueTime(Date.from(now))
                            .expirationTime(Date.from(now.plusSeconds(3600)))
                            .build()
            );
            jwt.sign(new RSASSASigner(parseRsaPrivateKey(privateKey)));
            return jwt.serialize();
        } catch (JOSEException exception) {
            throw new PushProviderException("FCM OAuth JWT signing failed", "fcm_oauth_sign_failed");
        }
    }

    private Map<String, String> loadFcmServiceAccount() {
        String raw = readFile(properties.getPush().getPushFcmServiceAccountJsonPath(), "fcm_service_account");
        Map<String, Object> bodyJson = readJsonObject(raw);
        Map<String, String> result = new LinkedHashMap<>();
        bodyJson.forEach((key, value) -> result.put(key, value == null ? null : String.valueOf(value)));
        return result;
    }

    private HttpRequest.Builder requestBuilder(String uri) {
        return HttpRequest.newBuilder(URI.create(uri))
                .timeout(Duration.ofSeconds(10));
    }

    private HttpRequest.BodyPublisher jsonBody(Object payload) {
        try {
            return HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new PushProviderException("Failed to serialize push payload", "push_payload_invalid");
        }
    }

    private HttpResponse<String> send(HttpRequest request) {
        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new PushProviderException(exception.getMessage(), "push_provider_error");
        } catch (IOException exception) {
            throw new PushProviderException(exception.getMessage(), "push_provider_error");
        }
    }

    private Map<String, Object> readJsonObject(String raw) {
        if (blank(raw)) {
            return Map.of();
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(raw, MAP_TYPE);
            return parsed == null ? Map.of() : parsed;
        } catch (IOException exception) {
            return Map.of();
        }
    }

    private String readFile(String path, String label) {
        if (blank(path)) {
            throw new PushProviderException(label + " path is not configured", label + "_path_missing");
        }
        try {
            return Files.readString(Path.of(path));
        } catch (IOException exception) {
            throw new PushProviderException(label + " file could not be read", label + "_path_missing");
        }
    }

    private String apnsEndpoint(String environment, String token) {
        String host = "development".equals(environment) ? "api.sandbox.push.apple.com" : "api.push.apple.com";
        return "https://" + host + "/3/device/" + token;
    }

    private ECPrivateKey parseEcPrivateKey(String pem) {
        return (ECPrivateKey) parsePrivateKey(pem, "EC");
    }

    private RSAPrivateKey parseRsaPrivateKey(String pem) {
        return (RSAPrivateKey) parsePrivateKey(pem, "RSA");
    }

    private PrivateKey parsePrivateKey(String pem, String algorithm) {
        try {
            String base64 = pem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] bytes = Base64.getDecoder().decode(base64);
            return KeyFactory.getInstance(algorithm).generatePrivate(new PKCS8EncodedKeySpec(bytes));
        } catch (Exception exception) {
            throw new PushProviderException(algorithm + " private key could not be parsed", "push_private_key_invalid");
        }
    }

    private Map<String, Object> childMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> converted = new LinkedHashMap<>();
            map.forEach((key, item) -> converted.put(String.valueOf(key), item));
            return converted;
        }
        return Map.of();
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
