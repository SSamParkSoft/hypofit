package com.contentruck.hypofit.admin.persistence;

import com.contentruck.hypofit.admin.application.AdminModerationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminModerationPersistenceAdapter implements AdminModerationRepository {

    private static final RowMapper<UserTargetRecord> USER_ROW_MAPPER = AdminModerationPersistenceAdapter::mapUser;
    private static final RowMapper<ChatMessageTargetRecord> CHAT_MESSAGE_ROW_MAPPER =
            AdminModerationPersistenceAdapter::mapChatMessage;
    private static final RowMapper<InterviewPostTargetRecord> INTERVIEW_POST_ROW_MAPPER =
            AdminModerationPersistenceAdapter::mapInterviewPost;
    private static final RowMapper<ApplicationTargetRecord> APPLICATION_ROW_MAPPER =
            AdminModerationPersistenceAdapter::mapApplication;
    private static final RowMapper<InterviewSessionTargetRecord> SESSION_ROW_MAPPER =
            AdminModerationPersistenceAdapter::mapSession;

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AdminModerationPersistenceAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public ModerationActionRecord createModerationAction(
            UUID actorUserId,
            String targetType,
            UUID targetId,
            String action,
            String reason,
            UUID sourceTicketId,
            Map<String, Object> metadata
    ) {
        UUID id = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        Map<String, Object> normalizedMetadata = metadata == null ? Map.of() : new LinkedHashMap<>(metadata);

        jdbcTemplate.update("""
                        insert into moderation_actions (
                          id,
                          actor_user_id,
                          target_type,
                          target_id,
                          action,
                          reason,
                          source_ticket_id,
                          metadata,
                          created_at
                        ) values (
                          :id,
                          :actorUserId,
                          :targetType,
                          :targetId,
                          :action,
                          :reason,
                          :sourceTicketId,
                          cast(:metadata as jsonb),
                          :createdAt
                        )
                        """, new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("actorUserId", actorUserId)
                        .addValue("targetType", targetType)
                        .addValue("targetId", targetId)
                        .addValue("action", action)
                        .addValue("reason", reason)
                        .addValue("sourceTicketId", sourceTicketId)
                        .addValue("metadata", writeJson(normalizedMetadata))
                        .addValue("createdAt", createdAt));

        return new ModerationActionRecord(
                id,
                actorUserId,
                targetType,
                targetId,
                action,
                reason,
                sourceTicketId,
                normalizedMetadata,
                createdAt
        );
    }

    @Override
    public Optional<UserTargetRecord> findUser(UUID userId) {
        return jdbcTemplate.query("""
                        select id, deactivated_at, deleted_at
                        from app_users
                        where id = :userId
                        limit 1
                        """, Map.of("userId", userId), USER_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public void updateUserDeactivated(UUID userId, OffsetDateTime deactivatedAt) {
        jdbcTemplate.update("""
                        update app_users
                        set deactivated_at = :deactivatedAt
                        where id = :userId
                        """, new MapSqlParameterSource()
                        .addValue("deactivatedAt", deactivatedAt)
                        .addValue("userId", userId));
    }

    @Override
    public Optional<ChatMessageTargetRecord> findChatMessage(UUID messageId) {
        return jdbcTemplate.query("""
                        select id, hidden_at, hidden_reason
                        from chat_messages
                        where id = :messageId
                        limit 1
                        """, Map.of("messageId", messageId), CHAT_MESSAGE_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public void updateChatMessageHidden(UUID messageId, OffsetDateTime hiddenAt, String hiddenReason) {
        jdbcTemplate.update("""
                        update chat_messages
                        set hidden_at = :hiddenAt,
                            hidden_reason = :hiddenReason
                        where id = :messageId
                        """, new MapSqlParameterSource()
                        .addValue("hiddenAt", hiddenAt)
                        .addValue("hiddenReason", hiddenReason)
                        .addValue("messageId", messageId));
    }

    @Override
    public Optional<InterviewPostTargetRecord> findInterviewPost(UUID postId) {
        return jdbcTemplate.query("""
                        select id, status
                        from interview_posts
                        where id = :postId
                        limit 1
                        """, Map.of("postId", postId), INTERVIEW_POST_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public void updateInterviewPostStatus(UUID postId, String status) {
        jdbcTemplate.update("""
                        update interview_posts
                        set status = :status
                        where id = :postId
                        """, Map.of("status", status, "postId", postId));
    }

    @Override
    public Optional<ApplicationTargetRecord> findApplication(UUID applicationId) {
        return jdbcTemplate.query("""
                        select id, status, moderation_status
                        from applications
                        where id = :applicationId
                        limit 1
                        """, Map.of("applicationId", applicationId), APPLICATION_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public void updateApplicationModerationStatus(UUID applicationId, String moderationStatus) {
        jdbcTemplate.update("""
                        update applications
                        set moderation_status = :moderationStatus
                        where id = :applicationId
                        """, Map.of(
                        "moderationStatus", moderationStatus,
                        "applicationId", applicationId
                ));
    }

    @Override
    public Optional<InterviewSessionTargetRecord> findInterviewSession(UUID sessionId) {
        return jdbcTemplate.query("""
                        select id, status, moderation_status
                        from interview_sessions
                        where id = :sessionId
                        limit 1
                        """, Map.of("sessionId", sessionId), SESSION_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public void updateInterviewSessionModerationStatus(UUID sessionId, String moderationStatus) {
        jdbcTemplate.update("""
                        update interview_sessions
                        set moderation_status = :moderationStatus
                        where id = :sessionId
                        """, Map.of(
                        "moderationStatus", moderationStatus,
                        "sessionId", sessionId
                ));
    }

    @Override
    public void recordAuditEvent(
            UUID actorUserId,
            String actorType,
            String eventType,
            String targetType,
            UUID targetId,
            Map<String, Object> before,
            Map<String, Object> after,
            String reason,
            Map<String, Object> metadata
    ) {
        jdbcTemplate.update("""
                        insert into audit_events (
                          id,
                          actor_user_id,
                          actor_type,
                          event_type,
                          target_type,
                          target_id,
                          before,
                          after,
                          reason,
                          metadata
                        ) values (
                          :id,
                          :actorUserId,
                          :actorType,
                          :eventType,
                          :targetType,
                          :targetId,
                          cast(:before as jsonb),
                          cast(:after as jsonb),
                          :reason,
                          cast(:metadata as jsonb)
                        )
                        """, new MapSqlParameterSource()
                        .addValue("id", UUID.randomUUID())
                        .addValue("actorUserId", actorUserId)
                        .addValue("actorType", actorType)
                        .addValue("eventType", eventType)
                        .addValue("targetType", targetType)
                        .addValue("targetId", targetId)
                        .addValue("before", writeNullableJson(before))
                        .addValue("after", writeNullableJson(after))
                        .addValue("reason", reason)
                        .addValue("metadata", writeJson(metadata == null ? Map.of() : metadata)));
    }

    private String writeNullableJson(Map<String, Object> value) {
        return value == null ? null : writeJson(value);
    }

    private static UserTargetRecord mapUser(ResultSet resultSet, int rowNum) throws SQLException {
        return new UserTargetRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("deactivated_at", OffsetDateTime.class),
                resultSet.getObject("deleted_at", OffsetDateTime.class)
        );
    }

    private static ChatMessageTargetRecord mapChatMessage(ResultSet resultSet, int rowNum) throws SQLException {
        return new ChatMessageTargetRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("hidden_at", OffsetDateTime.class),
                resultSet.getString("hidden_reason")
        );
    }

    private static InterviewPostTargetRecord mapInterviewPost(ResultSet resultSet, int rowNum) throws SQLException {
        return new InterviewPostTargetRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("status")
        );
    }

    private static ApplicationTargetRecord mapApplication(ResultSet resultSet, int rowNum) throws SQLException {
        return new ApplicationTargetRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("status"),
                resultSet.getString("moderation_status")
        );
    }

    private static InterviewSessionTargetRecord mapSession(ResultSet resultSet, int rowNum) throws SQLException {
        return new InterviewSessionTargetRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("status"),
                resultSet.getString("moderation_status")
        );
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize moderation JSON", exception);
        }
    }
}
