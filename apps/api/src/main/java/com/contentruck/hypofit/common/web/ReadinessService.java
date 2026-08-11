package com.contentruck.hypofit.common.web;

import java.util.LinkedHashMap;
import java.util.Map;

import com.contentruck.hypofit.common.config.HypofitProperties;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class ReadinessService {

    private final JdbcClient jdbcClient;
    private final HypofitProperties properties;

    public ReadinessService(JdbcClient jdbcClient, HypofitProperties properties) {
        this.jdbcClient = jdbcClient;
        this.properties = properties;
    }

    public Map<String, Object> readiness() {
        Map<String, Object> checks = new LinkedHashMap<>();
        checks.put("database", databaseStatus());
        checks.put("kakao_rest_api_key", !properties.getKakaoRestApiKey().isBlank());
        checks.put("supabase_url", !properties.getSupabaseUrl().isBlank());
        checks.put("jwks_configured", !properties.getResolvedSupabaseJwksUrl().isBlank() || !properties.getSupabaseJwtSecret().isBlank());
        checks.put("outbound_email", properties.outboundEmailReadiness());
        checks.put("push", properties.pushReadiness());
        checks.put("social_auth", properties.socialAuthReadiness());

        String status = requiredChecksOk(checks) ? "ok" : "degraded";
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", status);
        response.put("service", "hypofit-api");
        response.put("checks", checks);
        return response;
    }

    protected String databaseStatus() {
        try {
            Integer value = jdbcClient.sql("select 1").query(Integer.class).single();
            return Integer.valueOf(1).equals(value) ? "ok" : "unavailable";
        } catch (Exception exception) {
            return "unavailable";
        }
    }

    private boolean requiredChecksOk(Map<String, Object> checks) {
        if (!"ok".equals(checks.get("database"))) {
            return false;
        }

        if (!properties.isProduction()) {
            return true;
        }

        if (!Boolean.TRUE.equals(checks.get("supabase_url")) || !Boolean.TRUE.equals(checks.get("jwks_configured"))) {
            return false;
        }

        if (!Boolean.TRUE.equals(checks.get("kakao_rest_api_key"))) {
            return false;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> outboundEmail = (Map<String, Object>) checks.get("outbound_email");
        if (outboundEmail != null && !Boolean.TRUE.equals(outboundEmail.get("configured"))) {
            return false;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> push = (Map<String, Object>) checks.get("push");
        if (push != null && Boolean.TRUE.equals(push.get("enabled"))) {
            @SuppressWarnings("unchecked")
            Map<String, Object> apns = (Map<String, Object>) push.get("apns");
            @SuppressWarnings("unchecked")
            Map<String, Object> fcm = (Map<String, Object>) push.get("fcm");
            if (apns != null && Boolean.TRUE.equals(apns.get("enabled")) && !Boolean.TRUE.equals(apns.get("configured"))) {
                return false;
            }
            if (fcm != null && Boolean.TRUE.equals(fcm.get("enabled")) && !Boolean.TRUE.equals(fcm.get("configured"))) {
                return false;
            }
        }

        return true;
    }
}
