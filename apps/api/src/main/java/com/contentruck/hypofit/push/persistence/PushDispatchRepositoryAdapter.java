package com.contentruck.hypofit.push.persistence;

import com.contentruck.hypofit.push.application.PushDispatchRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PushDispatchRepositoryAdapter implements PushDispatchRepository {

    private static final TypeReference<Map<String, Object>> OBJECT_MAP_TYPE = new TypeReference<>() {
    };

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PushDispatchRepositoryAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public int resetStaleSendingDeliveries(OffsetDateTime now, int timeoutSeconds, int maxAttempts) {
        return jdbcTemplate.update("""
                        update push_deliveries
                        set status = 'pending',
                            next_attempt_at = :now,
                            updated_at = :now
                        where status = 'sending'
                          and updated_at <= (:now - make_interval(secs => :timeoutSeconds))
                          and attempt_count < :maxAttempts
                        """, Map.of(
                        "now", now,
                        "timeoutSeconds", timeoutSeconds,
                        "maxAttempts", maxAttempts
                ));
    }

    @Override
    public List<ClaimedPushDeliveryRecord> claimPendingDeliveries(OffsetDateTime now, int limit) {
        List<UUID> claimedIds = jdbcTemplate.query("""
                        with candidate as (
                          select pd.id
                          from push_deliveries pd
                          join push_devices d on d.id = pd.push_device_id
                          where pd.status = 'pending'
                            and pd.next_attempt_at <= :now
                            and d.enabled = true
                          order by pd.next_attempt_at asc, pd.created_at asc
                          limit :limit
                          for update skip locked
                        )
                        update push_deliveries pd
                        set status = 'sending',
                            attempt_count = pd.attempt_count + 1,
                            updated_at = :now
                        from candidate
                        where pd.id = candidate.id
                        returning pd.id
                        """, Map.of(
                        "now", now,
                        "limit", limit
                ), (resultSet, rowNum) -> resultSet.getObject(1, UUID.class));
        if (claimedIds.isEmpty()) {
            return List.of();
        }

        Map<UUID, ClaimedPushDeliveryRecord> rowsById = new LinkedHashMap<>();
        jdbcTemplate.query("""
                        select
                          pd.id as delivery_id,
                          pd.attempt_count,
                          d.id as device_id,
                          d.provider as device_provider,
                          d.environment as device_environment,
                          d.token as device_token,
                          d.token_hash as device_token_hash,
                          n.id as notification_id,
                          n.user_id as notification_user_id,
                          n.type as notification_type,
                          n.title as notification_title,
                          n.body as notification_body,
                          n.target_type as notification_target_type,
                          n.target_id as notification_target_id,
                          n.metadata::text as notification_metadata_json
                        from push_deliveries pd
                        join push_devices d on d.id = pd.push_device_id
                        join notifications n on n.id = pd.notification_id
                        where pd.id in (:ids)
                        """, Map.of("ids", claimedIds), claimedDeliveryRowMapper(rowsById));

        return claimedIds.stream()
                .map(rowsById::get)
                .filter(record -> record != null)
                .toList();
    }

    @Override
    public void markDeliverySent(
            OffsetDateTime now,
            UUID deliveryId,
            UUID pushDeviceId,
            String providerMessageId,
            String providerStatus
    ) {
        jdbcTemplate.update("""
                        update push_deliveries
                        set status = 'sent',
                            sent_at = :now,
                            provider_message_id = :providerMessageId,
                            provider_status = :providerStatus,
                            updated_at = :now
                        where id = :deliveryId
                        """, Map.of(
                        "now", now,
                        "providerMessageId", providerMessageId,
                        "providerStatus", providerStatus,
                        "deliveryId", deliveryId
                ));
        jdbcTemplate.update("""
                        update push_devices
                        set last_success_at = :now,
                            failure_count = 0,
                            updated_at = :now
                        where id = :pushDeviceId
                        """, Map.of("now", now, "pushDeviceId", pushDeviceId));
    }

    @Override
    public void markDeliveryFailed(
            OffsetDateTime now,
            UUID deliveryId,
            UUID pushDeviceId,
            int attemptCount,
            String providerStatus,
            String errorCode,
            String errorMessage,
            int maxAttempts
    ) {
        String status = attemptCount >= maxAttempts ? "failed" : "pending";
        OffsetDateTime nextAttemptAt = now.plusMinutes(Math.min(60, 1L << Math.max(attemptCount, 1)));
        jdbcTemplate.update("""
                        update push_deliveries
                        set status = :status,
                            next_attempt_at = :nextAttemptAt,
                            provider_status = :providerStatus,
                            provider_error_code = :errorCode,
                            provider_error_message = :errorMessage,
                            updated_at = :now
                        where id = :deliveryId
                        """, Map.of(
                        "status", status,
                        "nextAttemptAt", nextAttemptAt,
                        "providerStatus", providerStatus,
                        "errorCode", errorCode,
                        "errorMessage", errorMessage,
                        "now", now,
                        "deliveryId", deliveryId
                ));
        jdbcTemplate.update("""
                        update push_devices
                        set last_failure_at = :now,
                            failure_count = failure_count + 1,
                            updated_at = :now
                        where id = :pushDeviceId
                        """, Map.of("now", now, "pushDeviceId", pushDeviceId));
    }

    @Override
    public void markDeliveryInvalid(
            OffsetDateTime now,
            UUID deliveryId,
            UUID pushDeviceId,
            String providerStatus,
            String errorCode,
            String errorMessage
    ) {
        jdbcTemplate.update("""
                        update push_deliveries
                        set status = 'invalid',
                            provider_status = :providerStatus,
                            provider_error_code = :errorCode,
                            provider_error_message = :errorMessage,
                            updated_at = :now
                        where id = :deliveryId
                        """, Map.of(
                        "providerStatus", providerStatus,
                        "errorCode", errorCode,
                        "errorMessage", errorMessage,
                        "now", now,
                        "deliveryId", deliveryId
                ));
        jdbcTemplate.update("""
                        update push_devices
                        set enabled = false,
                            disabled_at = :now,
                            disabled_reason = :disabledReason,
                            last_failure_at = :now,
                            failure_count = failure_count + 1,
                            updated_at = :now
                        where id = :pushDeviceId
                        """, Map.of(
                        "now", now,
                        "disabledReason", errorCode == null || errorCode.isBlank() ? "provider_invalid_token" : errorCode,
                        "pushDeviceId", pushDeviceId
                ));
    }

    @Override
    public void markDeliverySkipped(
            OffsetDateTime now,
            UUID deliveryId,
            String providerStatus,
            String errorCode,
            String errorMessage
    ) {
        jdbcTemplate.update("""
                        update push_deliveries
                        set status = 'skipped',
                            provider_status = :providerStatus,
                            provider_error_code = :errorCode,
                            provider_error_message = :errorMessage,
                            updated_at = :now
                        where id = :deliveryId
                        """, Map.of(
                        "providerStatus", providerStatus,
                        "errorCode", errorCode,
                        "errorMessage", errorMessage,
                        "now", now,
                        "deliveryId", deliveryId
                ));
    }

    private RowMapper<ClaimedPushDeliveryRecord> claimedDeliveryRowMapper(Map<UUID, ClaimedPushDeliveryRecord> rowsById) {
        return (resultSet, rowNum) -> {
            ClaimedPushDeliveryRecord record = mapClaimedDelivery(resultSet);
            rowsById.put(record.deliveryId(), record);
            return record;
        };
    }

    private ClaimedPushDeliveryRecord mapClaimedDelivery(ResultSet resultSet) throws SQLException {
        return new ClaimedPushDeliveryRecord(
                resultSet.getObject("delivery_id", UUID.class),
                resultSet.getInt("attempt_count"),
                new PushDeviceDispatchRecord(
                        resultSet.getObject("device_id", UUID.class),
                        resultSet.getString("device_provider"),
                        resultSet.getString("device_environment"),
                        resultSet.getString("device_token"),
                        resultSet.getString("device_token_hash")
                ),
                new NotificationDispatchRecord(
                        resultSet.getObject("notification_id", UUID.class),
                        resultSet.getObject("notification_user_id", UUID.class),
                        resultSet.getString("notification_type"),
                        resultSet.getString("notification_title"),
                        resultSet.getString("notification_body"),
                        resultSet.getString("notification_target_type"),
                        resultSet.getObject("notification_target_id", UUID.class),
                        readObjectMap(resultSet.getString("notification_metadata_json"))
                )
        );
    }

    private Map<String, Object> readObjectMap(String raw) {
        if (raw == null || raw.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(raw, OBJECT_MAP_TYPE);
            return parsed == null ? Map.of() : parsed;
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse notification metadata JSON", exception);
        }
    }
}
