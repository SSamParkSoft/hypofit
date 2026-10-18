package com.contentruck.hypofit.push.repository;

import com.contentruck.hypofit.push.service.PushDispatchRepository;
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
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PushDispatchRepositoryAdapter implements PushDispatchRepository {

    private static final TypeReference<Map<String, Object>> OBJECT_MAP_TYPE = new TypeReference<>() {
    };

    private static final String PREFERENCE_ALLOWS_DELIVERY_SQL = """
            p.push_enabled = true and case
              when n.type = 'chat_message' then p.chat_push_enabled
              when n.type like 'application_%' then p.application_push_enabled
              when n.type in (
                'attendance_confirmation_requested',
                'no_show_marked',
                'reward_marked_paid',
                'reward_confirmed',
                'reward_disputed',
                'review_received'
              ) or n.type like 'session_%' then p.session_push_enabled
              when n.type = 'support_replied' then p.support_push_enabled
              else false
            end
            """;

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
    public PushOutboxSnapshot snapshotPendingDeliveries(OffsetDateTime now) {
        return jdbcTemplate.queryForObject("""
                        select
                          count(*) as pending_count,
                          coalesce(extract(epoch from (:now - min(pd.created_at))), 0) as oldest_pending_age_seconds
                        from push_deliveries pd
                        where pd.status = 'pending'
                          and pd.next_attempt_at <= :now
                        """, Map.of("now", now), (resultSet, rowNum) -> new PushOutboxSnapshot(
                        resultSet.getLong("pending_count"),
                        resultSet.getLong("oldest_pending_age_seconds")
                ));
    }

    @Override
    public List<ClaimedPushDeliveryRecord> claimPendingDeliveries(OffsetDateTime now, int limit) {
        return claimNotificationDeliveries(now, limit, null);
    }

    @Override
    public List<ClaimedPushDeliveryRecord> claimNotificationDeliveries(OffsetDateTime now, int limit, UUID notificationId) {
        List<UUID> claimedIds = jdbcTemplate.query("""
                        with candidate as (
                          select pd.id
                          from push_deliveries pd
                          where pd.status = 'pending'
                            and (cast(:notificationId as uuid) is null or pd.notification_id = cast(:notificationId as uuid))
                            and pd.next_attempt_at <= :now
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
                        """, new MapSqlParameterSource()
                        .addValue("now", now).addValue("limit", limit)
                        .addValue("notificationId", notificationId, java.sql.Types.OTHER),
                        (resultSet, rowNum) -> resultSet.getObject(1, UUID.class));
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
    public boolean isDeliveryEligible(ClaimedPushDeliveryRecord delivery) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject("""
                        select exists (
                          select 1
                          from push_deliveries pd
                          join notifications n on n.id = pd.notification_id and n.user_id = pd.user_id
                          join app_users u on u.id = pd.user_id
                          join push_devices d on d.id = pd.push_device_id and d.user_id = pd.user_id
                          join notification_preferences p on p.user_id = pd.user_id
                          where pd.id = :deliveryId
                            and pd.status = 'sending'
                            and pd.user_id = :userId
                            and n.id = :notificationId
                            and n.type = :notificationType
                            and d.id = :deviceId
                            and d.token_hash = :tokenHash
                            and d.enabled = true
                            and d.permission_status in ('granted', 'provisional')
                            and u.deleted_at is null
                            and u.deactivated_at is null
                            and not exists(select 1 from applications a
                              join interview_posts post on post.id = a.interview_post_id
                              where a.sharing_withdrawn_at is not null and post.founder_id = pd.user_id
                                and ((n.target_type = 'application' and n.target_id = a.id)
                                  or (n.target_type = 'chat_room' and exists(select 1 from chat_rooms r
                                      where r.application_id = a.id and r.id = n.target_id))
                                  or (n.target_type in ('session', 'interview_session') and exists(select 1 from interview_sessions s
                                      where s.application_id = a.id and s.id = n.target_id))))
                            and (%s)
                        )
                        """.formatted(PREFERENCE_ALLOWS_DELIVERY_SQL), new MapSqlParameterSource()
                        .addValue("deliveryId", delivery.deliveryId())
                        .addValue("userId", delivery.notification().userId())
                        .addValue("notificationId", delivery.notification().id())
                        .addValue("notificationType", delivery.notification().type())
                        .addValue("deviceId", delivery.device().id())
                        .addValue("tokenHash", delivery.device().tokenHash()), Boolean.class));
    }

    @Override
    public void skipPendingDeliveriesForPreferences(UUID userId, OffsetDateTime now) {
        jdbcTemplate.update("""
                        update push_deliveries pd
                        set status = 'skipped',
                            provider_status = 'skipped',
                            provider_error_code = 'push_preference_disabled',
                            provider_error_message = 'Push disabled by recipient preference',
                            updated_at = :now
                        from notifications n, notification_preferences p
                        where pd.user_id = :userId
                          and pd.status = 'pending'
                          and n.id = pd.notification_id
                          and p.user_id = pd.user_id
                          and not (%s)
                        """.formatted(PREFERENCE_ALLOWS_DELIVERY_SQL), Map.of("userId", userId, "now", now));
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
                        """, new MapSqlParameterSource().addValue("now", now)
                        .addValue("providerMessageId", providerMessageId)
                        .addValue("providerStatus", providerStatus).addValue("deliveryId", deliveryId));
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
                        """, new MapSqlParameterSource().addValue("status", status)
                        .addValue("nextAttemptAt", nextAttemptAt).addValue("providerStatus", providerStatus)
                        .addValue("errorCode", errorCode).addValue("errorMessage", errorMessage)
                        .addValue("now", now).addValue("deliveryId", deliveryId));
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
                        """, new MapSqlParameterSource().addValue("providerStatus", providerStatus)
                        .addValue("errorCode", errorCode).addValue("errorMessage", errorMessage)
                        .addValue("now", now).addValue("deliveryId", deliveryId));
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
                        """, new MapSqlParameterSource().addValue("providerStatus", providerStatus)
                        .addValue("errorCode", errorCode).addValue("errorMessage", errorMessage)
                        .addValue("now", now).addValue("deliveryId", deliveryId));
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
