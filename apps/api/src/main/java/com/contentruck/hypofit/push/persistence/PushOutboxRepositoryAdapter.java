package com.contentruck.hypofit.push.persistence;

import com.contentruck.hypofit.notification.domain.NotificationReadModel;
import com.contentruck.hypofit.push.application.PushOutboxRepository;
import java.time.OffsetDateTime;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PushOutboxRepositoryAdapter implements PushOutboxRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public PushOutboxRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public int enqueueDeliveries(
            NotificationReadModel notification,
            OffsetDateTime now,
            boolean apnsEnabled,
            boolean fcmEnabled
    ) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("notificationId", notification.id())
                .addValue("userId", notification.userId())
                .addValue("notificationType", notification.type())
                .addValue("now", now)
                .addValue("apnsEnabled", apnsEnabled)
                .addValue("fcmEnabled", fcmEnabled);
        return jdbcTemplate.update("""
                        insert into push_deliveries (
                          id,
                          notification_id,
                          push_device_id,
                          user_id,
                          provider,
                          status,
                          attempt_count,
                          next_attempt_at,
                          created_at,
                          updated_at
                        )
                        select
                          gen_random_uuid(),
                          :notificationId,
                          d.id,
                          :userId,
                          d.provider,
                          'pending',
                          0,
                          :now,
                          :now,
                          :now
                        from push_devices d
                        left join notification_preferences p on p.user_id = d.user_id
                        where d.user_id = :userId
                          and d.enabled = true
                          and (
                            (d.provider = 'apns' and :apnsEnabled = true)
                            or (d.provider = 'fcm' and :fcmEnabled = true)
                          )
                          and coalesce(p.push_enabled, false) = true
                          and case
                            when :notificationType = 'chat_message'
                              then coalesce(p.chat_push_enabled, true)
                            when :notificationType like 'application_%'
                              then coalesce(p.application_push_enabled, true)
                            when :notificationType in (
                              'attendance_confirmation_requested',
                              'no_show_marked',
                              'reward_marked_paid',
                              'reward_confirmed',
                              'reward_disputed',
                              'review_received'
                            ) or :notificationType like 'session_%'
                              then coalesce(p.session_push_enabled, true)
                            when :notificationType = 'support_replied'
                              then coalesce(p.support_push_enabled, true)
                            else false
                          end
                        on conflict (notification_id, push_device_id) do nothing
                        """, parameters);
    }
}
