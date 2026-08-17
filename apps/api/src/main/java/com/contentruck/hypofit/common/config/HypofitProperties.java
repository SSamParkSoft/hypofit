package com.contentruck.hypofit.common.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@ConfigurationProperties(prefix = "hypofit")
public class HypofitProperties {

    private String env = "local";
    private String databaseUrl = "postgresql://postgres:postgres@127.0.0.1:5432/hypofit";
    private List<String> corsOrigins = List.of("http://localhost:5173", "http://127.0.0.1:5173");
    private List<String> adminEmails = List.of();
    private String supabaseUrl = "";
    private String supabaseServiceRoleKey = "";
    private String supabaseJwtSecret = "";
    private String supabaseJwksUrl = "";
    private String supabaseJwtIssuer = "";
    private int supabaseJwksCacheSeconds = 300;
    private String jwtAudience = "authenticated";
    private String kakaoRestApiKey = "";
    private String supportEmail = "ssamso8282@gmail.com";
    private String resendApiKey = "";
    private String resendFromEmail = "";
    private String accountDeletionHashPepper = "";
    private boolean socialAuthEnabled;
    private String socialAuthAttemptPepper = "";
    private String socialAuthIdentityPepper = "";
    private String socialAuthAppleState = "disabled";
    private String socialAuthAppleIosState = "";
    private String socialAuthAppleWebState = "";
    private String socialAuthGoogleState = "disabled";
    private String socialAuthKakaoState = "disabled";
    private String socialAuthNaverState = "disabled";
    private final PushProperties push = new PushProperties();

    public String getEnv() {
        return env;
    }

    public void setEnv(String env) {
        this.env = env;
    }

    public String getDatabaseUrl() {
        return databaseUrl;
    }

    public void setDatabaseUrl(String databaseUrl) {
        this.databaseUrl = databaseUrl;
    }

    public List<String> getCorsOrigins() {
        return corsOrigins;
    }

    public void setCorsOrigins(List<String> corsOrigins) {
        this.corsOrigins = corsOrigins;
    }

    public List<String> getAdminEmails() {
        return adminEmails;
    }

    public void setAdminEmails(List<String> adminEmails) {
        this.adminEmails = adminEmails == null ? List.of() : List.copyOf(adminEmails);
    }

    public String getSupabaseUrl() {
        return supabaseUrl;
    }

    public void setSupabaseUrl(String supabaseUrl) {
        this.supabaseUrl = supabaseUrl;
    }

    public String getSupabaseServiceRoleKey() {
        return supabaseServiceRoleKey;
    }

    public void setSupabaseServiceRoleKey(String supabaseServiceRoleKey) {
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    public String getSupabaseJwtSecret() {
        return supabaseJwtSecret;
    }

    public void setSupabaseJwtSecret(String supabaseJwtSecret) {
        this.supabaseJwtSecret = supabaseJwtSecret;
    }

    public String getSupabaseJwksUrl() {
        return supabaseJwksUrl;
    }

    public void setSupabaseJwksUrl(String supabaseJwksUrl) {
        this.supabaseJwksUrl = supabaseJwksUrl;
    }

    public String getSupabaseJwtIssuer() {
        return supabaseJwtIssuer;
    }

    public void setSupabaseJwtIssuer(String supabaseJwtIssuer) {
        this.supabaseJwtIssuer = supabaseJwtIssuer;
    }

    public int getSupabaseJwksCacheSeconds() {
        return supabaseJwksCacheSeconds;
    }

    public void setSupabaseJwksCacheSeconds(int supabaseJwksCacheSeconds) {
        this.supabaseJwksCacheSeconds = supabaseJwksCacheSeconds;
    }

    public String getJwtAudience() {
        return jwtAudience;
    }

    public void setJwtAudience(String jwtAudience) {
        this.jwtAudience = jwtAudience;
    }

    public String getKakaoRestApiKey() {
        return kakaoRestApiKey;
    }

    public void setKakaoRestApiKey(String kakaoRestApiKey) {
        this.kakaoRestApiKey = kakaoRestApiKey;
    }

    public String getSupportEmail() {
        return supportEmail;
    }

    public void setSupportEmail(String supportEmail) {
        this.supportEmail = supportEmail;
    }

    public String getResendApiKey() {
        return resendApiKey;
    }

    public void setResendApiKey(String resendApiKey) {
        this.resendApiKey = resendApiKey;
    }

    public String getResendFromEmail() {
        return resendFromEmail;
    }

    public void setResendFromEmail(String resendFromEmail) {
        this.resendFromEmail = resendFromEmail;
    }

    public String getAccountDeletionHashPepper() {
        return accountDeletionHashPepper;
    }

    public void setAccountDeletionHashPepper(String accountDeletionHashPepper) {
        this.accountDeletionHashPepper = accountDeletionHashPepper;
    }

    public boolean isSocialAuthEnabled() {
        return socialAuthEnabled;
    }

    public void setSocialAuthEnabled(boolean socialAuthEnabled) {
        this.socialAuthEnabled = socialAuthEnabled;
    }

    public String getSocialAuthAttemptPepper() {
        return socialAuthAttemptPepper;
    }

    public void setSocialAuthAttemptPepper(String socialAuthAttemptPepper) {
        this.socialAuthAttemptPepper = socialAuthAttemptPepper;
    }

    public String getSocialAuthIdentityPepper() {
        return socialAuthIdentityPepper;
    }

    public void setSocialAuthIdentityPepper(String socialAuthIdentityPepper) {
        this.socialAuthIdentityPepper = socialAuthIdentityPepper;
    }

    public String getSocialAuthAppleState() {
        return socialAuthAppleState;
    }

    public void setSocialAuthAppleState(String socialAuthAppleState) {
        this.socialAuthAppleState = socialAuthAppleState;
    }

    public String getSocialAuthAppleIosState() {
        return socialAuthAppleIosState;
    }

    public void setSocialAuthAppleIosState(String socialAuthAppleIosState) {
        this.socialAuthAppleIosState = socialAuthAppleIosState;
    }

    public String getSocialAuthAppleWebState() {
        return socialAuthAppleWebState;
    }

    public void setSocialAuthAppleWebState(String socialAuthAppleWebState) {
        this.socialAuthAppleWebState = socialAuthAppleWebState;
    }

    public String getSocialAuthGoogleState() {
        return socialAuthGoogleState;
    }

    public void setSocialAuthGoogleState(String socialAuthGoogleState) {
        this.socialAuthGoogleState = socialAuthGoogleState;
    }

    public String getSocialAuthKakaoState() {
        return socialAuthKakaoState;
    }

    public void setSocialAuthKakaoState(String socialAuthKakaoState) {
        this.socialAuthKakaoState = socialAuthKakaoState;
    }

    public String getSocialAuthNaverState() {
        return socialAuthNaverState;
    }

    public void setSocialAuthNaverState(String socialAuthNaverState) {
        this.socialAuthNaverState = socialAuthNaverState;
    }

    public PushProperties getPush() {
        return push;
    }

    public boolean isProduction() {
        return "production".equalsIgnoreCase(env == null ? "" : env.trim());
    }

    public String getResolvedSupabaseJwksUrl() {
        if (StringUtils.hasText(supabaseJwksUrl)) {
            return supabaseJwksUrl.trim();
        }
        if (!StringUtils.hasText(supabaseUrl)) {
            return "";
        }
        return supabaseUrl.replaceAll("/+$", "") + "/auth/v1/.well-known/jwks.json";
    }

    public String getResolvedSupabaseJwtIssuer() {
        if (StringUtils.hasText(supabaseJwtIssuer)) {
            return supabaseJwtIssuer.trim().replaceAll("/+$", "");
        }
        if (!StringUtils.hasText(supabaseUrl)) {
            return "";
        }
        return supabaseUrl.trim().replaceAll("/+$", "") + "/auth/v1";
    }

    public Map<String, Object> outboundEmailReadiness() {
        return Map.of(
                "provider", "resend",
                "configured", StringUtils.hasText(resendApiKey) && StringUtils.hasText(resendFromEmail),
                "from_email_configured", StringUtils.hasText(resendFromEmail),
                "support_email_configured", StringUtils.hasText(supportEmail)
        );
    }

    public Map<String, Object> pushReadiness() {
        boolean apnsKeyExists = StringUtils.hasText(push.pushApnsPrivateKeyPath)
                && Files.exists(Path.of(push.pushApnsPrivateKeyPath));
        boolean fcmAccountExists = StringUtils.hasText(push.pushFcmServiceAccountJsonPath)
                && Files.exists(Path.of(push.pushFcmServiceAccountJsonPath));
        boolean apnsConfigured = StringUtils.hasText(push.pushApnsTeamId)
                && StringUtils.hasText(push.pushApnsKeyId)
                && StringUtils.hasText(push.pushApnsBundleId)
                && apnsKeyExists;
        boolean fcmConfigured = StringUtils.hasText(push.pushFcmProjectId) && fcmAccountExists;

        return Map.of(
                "enabled", push.enabled,
                "worker_enabled", push.pushWorkerEnabled,
                "worker", Map.of(
                        "active_sleep_seconds", push.pushWorkerActiveSleepSeconds,
                        "batch_size", push.pushWorkerBatchSize,
                        "error_sleep_seconds", push.pushWorkerErrorSleepSeconds,
                        "idle_sleep_seconds", push.pushWorkerIdleSleepSeconds
                ),
                "batch_size", push.pushBatchSize,
                "max_attempts", push.pushMaxAttempts,
                "apns", Map.of(
                        "enabled", push.pushApnsEnabled,
                        "environment", push.pushApnsEnv,
                        "configured", apnsConfigured,
                        "private_key_file_present", apnsKeyExists
                ),
                "fcm", Map.of(
                        "enabled", push.pushFcmEnabled,
                        "configured", fcmConfigured,
                        "service_account_file_present", fcmAccountExists
                )
        );
    }

    public Map<String, Object> socialAuthReadiness() {
        return Map.of(
                "enabled", socialAuthEnabled,
                "attempt_pepper_configured", StringUtils.hasText(socialAuthAttemptPepper),
                "identity_pepper_configured", StringUtils.hasText(socialAuthIdentityPepper),
                "providers", Map.of(
                        "apple", socialAuthAppleState,
                        "google", socialAuthGoogleState,
                        "kakao", socialAuthKakaoState,
                        "naver", socialAuthNaverState
                ),
                "apple_platforms", Map.of(
                        "web", StringUtils.hasText(socialAuthAppleWebState) ? socialAuthAppleWebState : socialAuthAppleState,
                        "ios", StringUtils.hasText(socialAuthAppleIosState) ? socialAuthAppleIosState : socialAuthAppleState,
                        "android", "unsupported_platform"
                )
        );
    }

    public static class PushProperties {

        private boolean enabled;
        private boolean pushWorkerEnabled;
        private int pushWorkerBatchSize = 20;
        private double pushWorkerActiveSleepSeconds = 2.0d;
        private double pushWorkerIdleSleepSeconds = 30.0d;
        private double pushWorkerErrorSleepSeconds = 30.0d;
        private int pushMaxAttempts = 3;
        private int pushBatchSize = 100;
        private int pushSendingTimeoutSeconds = 300;
        private boolean pushApnsEnabled;
        private String pushApnsEnv = "production";
        private String pushApnsTeamId = "";
        private String pushApnsKeyId = "";
        private String pushApnsBundleId = "com.contentruck.hypofit";
        private String pushApnsPrivateKeyPath = "";
        private boolean pushFcmEnabled;
        private String pushFcmProjectId = "";
        private String pushFcmServiceAccountJsonPath = "";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public boolean isPushWorkerEnabled() {
            return pushWorkerEnabled;
        }

        public void setPushWorkerEnabled(boolean pushWorkerEnabled) {
            this.pushWorkerEnabled = pushWorkerEnabled;
        }

        public int getPushWorkerBatchSize() {
            return pushWorkerBatchSize;
        }

        public void setPushWorkerBatchSize(int pushWorkerBatchSize) {
            this.pushWorkerBatchSize = pushWorkerBatchSize;
        }

        public double getPushWorkerActiveSleepSeconds() {
            return pushWorkerActiveSleepSeconds;
        }

        public void setPushWorkerActiveSleepSeconds(double pushWorkerActiveSleepSeconds) {
            this.pushWorkerActiveSleepSeconds = pushWorkerActiveSleepSeconds;
        }

        public double getPushWorkerIdleSleepSeconds() {
            return pushWorkerIdleSleepSeconds;
        }

        public void setPushWorkerIdleSleepSeconds(double pushWorkerIdleSleepSeconds) {
            this.pushWorkerIdleSleepSeconds = pushWorkerIdleSleepSeconds;
        }

        public double getPushWorkerErrorSleepSeconds() {
            return pushWorkerErrorSleepSeconds;
        }

        public void setPushWorkerErrorSleepSeconds(double pushWorkerErrorSleepSeconds) {
            this.pushWorkerErrorSleepSeconds = pushWorkerErrorSleepSeconds;
        }

        public int getPushMaxAttempts() {
            return pushMaxAttempts;
        }

        public void setPushMaxAttempts(int pushMaxAttempts) {
            this.pushMaxAttempts = pushMaxAttempts;
        }

        public int getPushBatchSize() {
            return pushBatchSize;
        }

        public void setPushBatchSize(int pushBatchSize) {
            this.pushBatchSize = pushBatchSize;
        }

        public int getPushSendingTimeoutSeconds() {
            return pushSendingTimeoutSeconds;
        }

        public void setPushSendingTimeoutSeconds(int pushSendingTimeoutSeconds) {
            this.pushSendingTimeoutSeconds = pushSendingTimeoutSeconds;
        }

        public boolean isPushApnsEnabled() {
            return pushApnsEnabled;
        }

        public void setPushApnsEnabled(boolean pushApnsEnabled) {
            this.pushApnsEnabled = pushApnsEnabled;
        }

        public String getPushApnsEnv() {
            return pushApnsEnv;
        }

        public void setPushApnsEnv(String pushApnsEnv) {
            this.pushApnsEnv = pushApnsEnv;
        }

        public String getPushApnsTeamId() {
            return pushApnsTeamId;
        }

        public void setPushApnsTeamId(String pushApnsTeamId) {
            this.pushApnsTeamId = pushApnsTeamId;
        }

        public String getPushApnsKeyId() {
            return pushApnsKeyId;
        }

        public void setPushApnsKeyId(String pushApnsKeyId) {
            this.pushApnsKeyId = pushApnsKeyId;
        }

        public String getPushApnsBundleId() {
            return pushApnsBundleId;
        }

        public void setPushApnsBundleId(String pushApnsBundleId) {
            this.pushApnsBundleId = pushApnsBundleId;
        }

        public String getPushApnsPrivateKeyPath() {
            return pushApnsPrivateKeyPath;
        }

        public void setPushApnsPrivateKeyPath(String pushApnsPrivateKeyPath) {
            this.pushApnsPrivateKeyPath = pushApnsPrivateKeyPath;
        }

        public boolean isPushFcmEnabled() {
            return pushFcmEnabled;
        }

        public void setPushFcmEnabled(boolean pushFcmEnabled) {
            this.pushFcmEnabled = pushFcmEnabled;
        }

        public String getPushFcmProjectId() {
            return pushFcmProjectId;
        }

        public void setPushFcmProjectId(String pushFcmProjectId) {
            this.pushFcmProjectId = pushFcmProjectId;
        }

        public String getPushFcmServiceAccountJsonPath() {
            return pushFcmServiceAccountJsonPath;
        }

        public void setPushFcmServiceAccountJsonPath(String pushFcmServiceAccountJsonPath) {
            this.pushFcmServiceAccountJsonPath = pushFcmServiceAccountJsonPath;
        }
    }
}
