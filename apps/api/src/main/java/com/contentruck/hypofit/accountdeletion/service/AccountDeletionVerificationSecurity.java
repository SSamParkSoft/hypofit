package com.contentruck.hypofit.accountdeletion.service;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
class AccountDeletionVerificationSecurity {

    private final HypofitProperties properties;

    AccountDeletionVerificationSecurity(HypofitProperties properties) {
        this.properties = properties;
    }

    String generateVerificationCode() {
        return String.format(Locale.ROOT, "%06d", ThreadLocalRandom.current().nextInt(1_000_000));
    }

    String generateDeletionAuthorization() {
        return UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
    }

    String hashVerificationCode(UUID requestId, String code) {
        return hmacSha256(requestId + ":" + code, pepper());
    }

    String hashEmail(String email) {
        return sha256(pepper() + ":" + email.trim().toLowerCase(Locale.ROOT));
    }

    String sha256(String material) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(material.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private String pepper() {
        return Objects.requireNonNullElse(properties.getAccountDeletionHashPepper(), "");
    }

    private String hmacSha256(String material, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(material.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("HmacSHA256 is not available", exception);
        }
    }
}
