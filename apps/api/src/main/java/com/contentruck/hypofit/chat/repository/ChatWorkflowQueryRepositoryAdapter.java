package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatInterviewSessionEntity;
import com.contentruck.hypofit.chat.service.ChatWorkflowModels;
import com.contentruck.hypofit.chat.service.ChatWorkflowQueryRepository;
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
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ChatWorkflowQueryRepositoryAdapter implements ChatWorkflowQueryRepository {

    private static final TypeReference<Map<String, String>> STRING_MAP_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ChatApplicationJpaRepository chatApplicationJpaRepository;
    private final ChatInterviewSessionJpaRepository chatInterviewSessionJpaRepository;

    public ChatWorkflowQueryRepositoryAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            ChatApplicationJpaRepository chatApplicationJpaRepository,
            ChatInterviewSessionJpaRepository chatInterviewSessionJpaRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.chatApplicationJpaRepository = chatApplicationJpaRepository;
        this.chatInterviewSessionJpaRepository = chatInterviewSessionJpaRepository;
    }

    @Override
    public Optional<ChatWorkflowQueryRepository.ApplicationMessageabilityRecord> findApplicationMessageability(UUID applicationId) {
        return chatApplicationJpaRepository.findById(applicationId)
                .map(application -> new ChatWorkflowQueryRepository.ApplicationMessageabilityRecord(
                        application.getId(),
                        application.getStatus()
                ));
    }

    @Override
    public Optional<String> findLatestVisibleSessionStatus(UUID applicationId) {
        return chatInterviewSessionJpaRepository
                .findFirstByApplicationIdAndModerationStatusOrderByCreatedAtDescIdDesc(applicationId, "visible")
                .map(ChatInterviewSessionEntity::getStatus);
    }

    @Override
    public Optional<ChatRoomWorkflowContextRecord> findRoomWorkflowContext(UUID roomId) {
        return jdbcTemplate.query(
                        roomWorkflowContextSql(),
                        new MapSqlParameterSource("room_id", roomId),
                        roomWorkflowContextRowMapper()
                )
                .stream()
                .findFirst();
    }

    @Override
    public Optional<ChatWorkflowModels.AttendanceRecordReadModel> findAttendanceRecord(UUID sessionId) {
        return jdbcTemplate.query(
                        """
                        select session_id, founder_confirmed, respondent_confirmed,
                               founder_confirmed_at, respondent_confirmed_at,
                               completed_at, no_show_party
                        from attendance_records
                        where session_id = :session_id
                        """,
                        new MapSqlParameterSource("session_id", sessionId),
                        attendanceRecordRowMapper()
                )
                .stream()
                .findFirst();
    }

    @Override
    public Optional<ChatWorkflowModels.RewardConfirmationReadModel> findRewardConfirmation(UUID sessionId) {
        return jdbcTemplate.query(
                        """
                        select id, session_id, application_id, founder_id, respondent_id,
                               amount, status, founder_marked_paid_at,
                               respondent_confirmed_at, disputed_at, dispute_reason,
                               created_at, updated_at
                        from reward_confirmations
                        where session_id = :session_id
                        """,
                        new MapSqlParameterSource("session_id", sessionId),
                        rewardConfirmationRowMapper()
                )
                .stream()
                .findFirst();
    }

    @Override
    public List<ChatWorkflowModels.InterviewReviewReadModel> findReviews(UUID sessionId) {
        return jdbcTemplate.query(
                """
                select id, session_id, reviewer_id, reviewee_id, reviewer_role,
                       rating, tags, comment, visibility, created_at, updated_at
                from interview_reviews
                where session_id = :session_id
                order by created_at asc, id asc
                """,
                new MapSqlParameterSource("session_id", sessionId),
                interviewReviewRowMapper()
        );
    }

    private String roomWorkflowContextSql() {
        return """
                select
                  p.id as post_id_ref,
                  a.id as application_id_ref,
                  a.interview_post_id as application_interview_post_id,
                  a.answers as application_answers,
                  a.available_times as application_available_times,
                  a.respondent_id as application_respondent_id,
                  a.status as application_status,
                  a.rejection_reason as application_rejection_reason,
                  respondent.id as respondent_user_id,
                  respondent.name as respondent_name,
                  respondent.bio as respondent_bio,
                  respondent.role as respondent_role,
                  respondent.profile_image_url as respondent_profile_image_url,
                  s.id as session_id_ref,
                  s.application_id as session_application_id,
                  s.scheduled_at as session_scheduled_at,
                  s.meeting_type as session_meeting_type,
                  s.meeting_url as session_meeting_url,
                  s.place as session_place,
                  s.status as session_status
                from chat_rooms r
                left join interview_posts p on p.id = r.interview_post_id
                left join applications a on a.id = r.application_id
                left join app_users respondent on respondent.id = a.respondent_id
                left join interview_sessions s
                  on s.id = (
                    select s2.id
                    from interview_sessions s2
                    where s2.application_id = r.application_id
                      and s2.moderation_status = 'visible'
                    order by s2.created_at desc, s2.id desc
                    limit 1
                  )
                where r.id = :room_id
                """;
    }

    private RowMapper<ChatRoomWorkflowContextRecord> roomWorkflowContextRowMapper() {
        return (rs, rowNum) -> {
            ChatWorkflowModels.ApplicationReadModel application = null;
            UUID applicationId = uuidNullable(rs, "application_id_ref");
            if (applicationId != null) {
                application = new ChatWorkflowModels.ApplicationReadModel(
                        applicationId,
                        uuid(rs, "application_interview_post_id"),
                        readStringMap(rs, "application_answers"),
                        readStringList(rs, "application_available_times"),
                        uuid(rs, "application_respondent_id"),
                        rs.getString("application_status"),
                        rs.getString("application_rejection_reason"),
                        new ChatWorkflowModels.UserSummary(
                                uuidNullable(rs, "respondent_user_id"),
                                rs.getString("respondent_name"),
                                rs.getString("respondent_bio"),
                                rs.getString("respondent_role"),
                                rs.getString("respondent_profile_image_url")
                        )
                );
            }

            ChatWorkflowModels.InterviewSessionReadModel latestSession = null;
            UUID sessionId = uuidNullable(rs, "session_id_ref");
            if (sessionId != null) {
                latestSession = new ChatWorkflowModels.InterviewSessionReadModel(
                        sessionId,
                        uuid(rs, "session_application_id"),
                        offsetDateTime(rs, "session_scheduled_at"),
                        rs.getString("session_meeting_type"),
                        rs.getString("session_meeting_url"),
                        rs.getString("session_place"),
                        rs.getString("session_status"),
                        application
                );
            }

            return new ChatRoomWorkflowContextRecord(
                    uuidNullable(rs, "post_id_ref"),
                    application,
                    latestSession
            );
        };
    }

    private RowMapper<ChatWorkflowModels.AttendanceRecordReadModel> attendanceRecordRowMapper() {
        return (rs, rowNum) -> new ChatWorkflowModels.AttendanceRecordReadModel(
                uuid(rs, "session_id"),
                rs.getBoolean("founder_confirmed"),
                rs.getBoolean("respondent_confirmed"),
                offsetDateTime(rs, "founder_confirmed_at"),
                offsetDateTime(rs, "respondent_confirmed_at"),
                offsetDateTime(rs, "completed_at"),
                rs.getString("no_show_party")
        );
    }

    private RowMapper<ChatWorkflowModels.RewardConfirmationReadModel> rewardConfirmationRowMapper() {
        return (rs, rowNum) -> new ChatWorkflowModels.RewardConfirmationReadModel(
                uuid(rs, "id"),
                uuid(rs, "session_id"),
                uuid(rs, "application_id"),
                uuid(rs, "founder_id"),
                uuid(rs, "respondent_id"),
                rs.getInt("amount"),
                rs.getString("status"),
                offsetDateTime(rs, "founder_marked_paid_at"),
                offsetDateTime(rs, "respondent_confirmed_at"),
                offsetDateTime(rs, "disputed_at"),
                rs.getString("dispute_reason"),
                offsetDateTime(rs, "created_at"),
                offsetDateTime(rs, "updated_at")
        );
    }

    private RowMapper<ChatWorkflowModels.InterviewReviewReadModel> interviewReviewRowMapper() {
        return (rs, rowNum) -> new ChatWorkflowModels.InterviewReviewReadModel(
                uuid(rs, "id"),
                uuid(rs, "session_id"),
                uuid(rs, "reviewer_id"),
                uuid(rs, "reviewee_id"),
                rs.getString("reviewer_role"),
                rs.getInt("rating"),
                readStringList(rs, "tags"),
                rs.getString("comment"),
                rs.getString("visibility"),
                offsetDateTime(rs, "created_at"),
                offsetDateTime(rs, "updated_at")
        );
    }

    private UUID uuid(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    private UUID uuidNullable(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    private OffsetDateTime offsetDateTime(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, OffsetDateTime.class);
    }

    private Map<String, String> readStringMap(ResultSet rs, String column) throws SQLException {
        String raw = rawJson(rs, column);
        if (raw == null || raw.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(raw, STRING_MAP_TYPE);
        } catch (JsonProcessingException exception) {
            throw new SQLException("Failed to parse JSON column " + column, exception);
        }
    }

    private List<String> readStringList(ResultSet rs, String column) throws SQLException {
        String raw = rawJson(rs, column);
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(raw, STRING_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            throw new SQLException("Failed to parse JSON column " + column, exception);
        }
    }

    private String rawJson(ResultSet rs, String column) throws SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : value.toString();
    }
}
