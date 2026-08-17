package com.contentruck.hypofit.admin.repository;

import com.contentruck.hypofit.admin.service.AdminOperationsRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminOperationsPersistenceAdapter implements AdminOperationsRepository {

    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<Map<String, String>> STRING_MAP_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<Map<String, Object>> OBJECT_MAP_TYPE = new TypeReference<>() {
    };
    private static final RowMapper<SupportStatusCount> SUPPORT_STATUS_COUNT_ROW_MAPPER =
            AdminOperationsPersistenceAdapter::mapSupportStatusCount;
    private static final RowMapper<UserPreviewRecord> USER_PREVIEW_ROW_MAPPER =
            AdminOperationsPersistenceAdapter::mapUserPreview;
    private static final RowMapper<InterviewPostPreviewRecord> INTERVIEW_POST_PREVIEW_ROW_MAPPER =
            AdminOperationsPersistenceAdapter::mapInterviewPostPreview;
    private static final RowMapper<ChatRoomPreviewRecord> CHAT_ROOM_PREVIEW_ROW_MAPPER =
            AdminOperationsPersistenceAdapter::mapChatRoomPreview;
    private static final RowMapper<ChatMessagePreviewRecord> CHAT_MESSAGE_PREVIEW_ROW_MAPPER =
            AdminOperationsPersistenceAdapter::mapChatMessagePreview;
    private static final RowMapper<SessionPreviewRecord> SESSION_PREVIEW_ROW_MAPPER =
            AdminOperationsPersistenceAdapter::mapSessionPreview;

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AdminOperationsPersistenceAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<SupportStatusCount> summarizeSupportStatuses() {
        return jdbcTemplate.query("""
                        select kind, status, count(id) as count
                        from support_tickets
                        where status in ('open', 'in_review')
                        group by kind, status
                        """, SUPPORT_STATUS_COUNT_ROW_MAPPER);
    }

    @Override
    public long countOpenAccountDeletionRequests() {
        Long count = jdbcTemplate.queryForObject("""
                        select count(id)
                        from account_deletion_requests
                        where status in ('requested', 'verified', 'in_review')
                           or (
                             status = 'completed'
                             and user_id is not null
                             and (
                               auth_user_delete_status is null
                               or auth_user_delete_status in ('pending', 'failed_retryable', 'skipped_missing_config')
                             )
                           )
                        """, Map.of(), Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public boolean isDatabaseAvailable() {
        try {
            Integer value = jdbcTemplate.getJdbcOperations().queryForObject("select 1", Integer.class);
            return value != null && value == 1;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    @Override
    public Optional<UserPreviewRecord> findUserPreview(UUID userId) {
        return jdbcTemplate.query("""
                        select id, email, name, role, phone, deleted_at, deactivated_at
                        from app_users
                        where id = :userId
                        limit 1
                        """, Map.of("userId", userId), USER_PREVIEW_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<InterviewPostPreviewRecord> findInterviewPostPreview(UUID postId) {
        return jdbcTemplate.query("""
                        select
                          id,
                          founder_id,
                          title,
                          service_summary,
                          status,
                          interview_mode,
                          reward_amount,
                          location_place_name,
                          location_address,
                          location_text
                        from interview_posts
                        where id = :postId
                        limit 1
                        """, Map.of("postId", postId), INTERVIEW_POST_PREVIEW_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<ApplicationPreviewRecord> findApplicationPreview(UUID applicationId) {
        return jdbcTemplate.query("""
                        select
                          id,
                          interview_post_id,
                          respondent_id,
                          available_times::text as available_times_json,
                          status,
                          moderation_status,
                          answers::text as answers_json
                        from applications
                        where id = :applicationId
                        limit 1
                        """, Map.of("applicationId", applicationId), (resultSet, rowNum) -> new ApplicationPreviewRecord(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("interview_post_id", UUID.class),
                        resultSet.getObject("respondent_id", UUID.class),
                        readStringList(resultSet.getString("available_times_json")),
                        resultSet.getString("status"),
                        resultSet.getString("moderation_status"),
                        readStringMap(resultSet.getString("answers_json"))
                ))
                .stream()
                .findFirst();
    }

    @Override
    public Optional<ChatRoomPreviewRecord> findChatRoomPreview(UUID roomId) {
        return jdbcTemplate.query("""
                        select id, interview_post_id, application_id, founder_id, respondent_id, status
                        from chat_rooms
                        where id = :roomId
                        limit 1
                        """, Map.of("roomId", roomId), CHAT_ROOM_PREVIEW_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<ChatMessagePreviewRecord> findChatMessagePreview(UUID messageId) {
        return jdbcTemplate.query("""
                        select id, room_id, sender_id, message_type, body, hidden_at, hidden_reason
                        from chat_messages
                        where id = :messageId
                        limit 1
                        """, Map.of("messageId", messageId), CHAT_MESSAGE_PREVIEW_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<SessionPreviewRecord> findSessionPreview(UUID sessionId) {
        return jdbcTemplate.query("""
                        select id, application_id, scheduled_at, meeting_type, meeting_url, place, status, moderation_status
                        from interview_sessions
                        where id = :sessionId
                        limit 1
                        """, Map.of("sessionId", sessionId), SESSION_PREVIEW_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<UserPreviewRecord> findUserByEmail(String normalizedEmail) {
        return jdbcTemplate.query("""
                        select id, email, name, role, phone, deleted_at, deactivated_at
                        from app_users
                        where lower(email) = :email
                        limit 1
                        """, Map.of("email", normalizedEmail), USER_PREVIEW_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    private static SupportStatusCount mapSupportStatusCount(ResultSet resultSet, int rowNum) throws SQLException {
        return new SupportStatusCount(
                resultSet.getString("kind"),
                resultSet.getString("status"),
                resultSet.getLong("count")
        );
    }

    private static UserPreviewRecord mapUserPreview(ResultSet resultSet, int rowNum) throws SQLException {
        return new UserPreviewRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("email"),
                resultSet.getString("name"),
                resultSet.getString("role"),
                resultSet.getString("phone"),
                resultSet.getObject("deleted_at", OffsetDateTime.class),
                resultSet.getObject("deactivated_at", OffsetDateTime.class)
        );
    }

    private static InterviewPostPreviewRecord mapInterviewPostPreview(ResultSet resultSet, int rowNum) throws SQLException {
        Integer rewardAmount = resultSet.getObject("reward_amount", Integer.class);
        return new InterviewPostPreviewRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("founder_id", UUID.class),
                resultSet.getString("title"),
                resultSet.getString("service_summary"),
                resultSet.getString("status"),
                resultSet.getString("interview_mode"),
                rewardAmount == null ? 0 : rewardAmount,
                resultSet.getString("location_place_name"),
                resultSet.getString("location_address"),
                resultSet.getString("location_text")
        );
    }

    private static ChatRoomPreviewRecord mapChatRoomPreview(ResultSet resultSet, int rowNum) throws SQLException {
        return new ChatRoomPreviewRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("interview_post_id", UUID.class),
                resultSet.getObject("application_id", UUID.class),
                resultSet.getObject("founder_id", UUID.class),
                resultSet.getObject("respondent_id", UUID.class),
                resultSet.getString("status")
        );
    }

    private static ChatMessagePreviewRecord mapChatMessagePreview(ResultSet resultSet, int rowNum) throws SQLException {
        return new ChatMessagePreviewRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("room_id", UUID.class),
                resultSet.getObject("sender_id", UUID.class),
                resultSet.getString("message_type"),
                resultSet.getString("body"),
                resultSet.getObject("hidden_at", OffsetDateTime.class),
                resultSet.getString("hidden_reason")
        );
    }

    private static SessionPreviewRecord mapSessionPreview(ResultSet resultSet, int rowNum) throws SQLException {
        return new SessionPreviewRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("application_id", UUID.class),
                resultSet.getObject("scheduled_at", OffsetDateTime.class),
                resultSet.getString("meeting_type"),
                resultSet.getString("meeting_url"),
                resultSet.getString("place"),
                resultSet.getString("status"),
                resultSet.getString("moderation_status")
        );
    }

    private List<String> readStringList(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(rawJson, STRING_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to deserialize string list JSON", exception);
        }
    }

    private Map<String, String> readStringMap(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(rawJson, STRING_MAP_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to deserialize string map JSON", exception);
        }
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize JSON", exception);
        }
    }
}
