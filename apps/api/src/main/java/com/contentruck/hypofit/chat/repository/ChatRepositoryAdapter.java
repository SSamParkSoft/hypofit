package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatRoomEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;

import com.contentruck.hypofit.chat.service.ChatRepository;
import com.contentruck.hypofit.chat.service.ChatApplicationSummary;
import com.contentruck.hypofit.chat.service.ChatInterviewPostSummary;
import com.contentruck.hypofit.chat.service.ChatMessageRepository;
import com.contentruck.hypofit.chat.service.ChatMessageReadModel;
import com.contentruck.hypofit.chat.service.ChatRoomReadModel;
import com.contentruck.hypofit.chat.service.ChatUserSummary;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ChatRepositoryAdapter implements ChatRepository {

    private static final String CHAT_ROOM_OPEN = "open";
    private static final String CHAT_ROOM_SELECTED = "selected";
    private static final String CHAT_ROOM_CLOSED = "closed";
    private static final String APPLICATION_CREATED_MESSAGE = "신청이 완료됐어요. 이 방에서 일정과 진행 방식을 조율할 수 있어요.";
    private static final String APPLICATION_SELECTED_MESSAGE = "인터뷰 대상자로 선정됐어요. 이제 일정과 진행 방식을 확정해보세요.";
    private static final String APPLICATION_REJECTED_MESSAGE = "이번 인터뷰 신청은 반려됐어요.";
    private static final String APPLICATION_CANCELED_MESSAGE = "인터뷰 신청이 취소됐어요.";

    private static final TypeReference<Map<String, String>> STRING_MAP_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ChatRoomJpaRepository chatRoomJpaRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomParticipantSettingJpaRepository chatRoomParticipantSettingJpaRepository;
    private final ChatUserAccountJpaRepository chatUserAccountJpaRepository;
    public ChatRepositoryAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            ChatRoomJpaRepository chatRoomJpaRepository,
            ChatMessageRepository chatMessageRepository,
            ChatRoomParticipantSettingJpaRepository chatRoomParticipantSettingJpaRepository,
            ChatUserAccountJpaRepository chatUserAccountJpaRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.chatRoomJpaRepository = chatRoomJpaRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatRoomParticipantSettingJpaRepository = chatRoomParticipantSettingJpaRepository;
        this.chatUserAccountJpaRepository = chatUserAccountJpaRepository;
    }

    @Override
    public List<ChatRoomReadModel> findRoomsForUser(UUID userId) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("user_id", userId);
        List<RoomProjection> rows = jdbcTemplate.query(listRoomsSql(), parameters, roomProjectionRowMapper());
        return attachLastMessages(rows);
    }

    @Override
    public Optional<CurrentUserAccountRecord> findCurrentUserAccount(UUID userId) {
        return chatUserAccountJpaRepository.findById(userId)
                .map(user -> new CurrentUserAccountRecord(
                        user.getId(),
                        user.getRole(),
                        user.getDeactivatedAt(),
                        user.getDeletedAt()
                ));
    }

    @Override
    public Optional<ChatRoomReadModel> findRoom(UUID roomId, UUID userId) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("room_id", roomId)
                .addValue("user_id", userId);
        List<RoomProjection> rows = jdbcTemplate.query(detailRoomSql(), parameters, roomProjectionRowMapper());
        return attachLastMessages(rows).stream().findFirst();
    }

    @Override
    public Optional<ChatRoomEntity> findRoomEntity(UUID roomId) {
        return chatRoomJpaRepository.findById(roomId);
    }

    @Override
    public void ensureRoomForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId
    ) {
        ensureApplicationRoom(applicationId, interviewPostId, founderId, respondentId);
    }

    @Override
    public void markSelectedForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId
    ) {
        UUID roomId = ensureApplicationRoom(applicationId, interviewPostId, founderId, respondentId);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        updateApplicationRoomStatus(roomId, CHAT_ROOM_SELECTED, now);
        insertApplicationSystemMessage(
                roomId,
                "application_selected",
                APPLICATION_SELECTED_MESSAGE,
                Map.of(),
                now
        );
    }

    @Override
    public void markRejectedForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId,
            String rejectionReason
    ) {
        UUID roomId = ensureApplicationRoom(applicationId, interviewPostId, founderId, respondentId);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        updateApplicationRoomStatus(roomId, CHAT_ROOM_CLOSED, now);
        insertApplicationSystemMessage(
                roomId,
                "application_rejected",
                APPLICATION_REJECTED_MESSAGE + "\n사유: " + rejectionReason,
                Map.of("rejection_reason", rejectionReason),
                now
        );
    }

    @Override
    public void markCanceledForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId
    ) {
        UUID roomId = ensureApplicationRoom(applicationId, interviewPostId, founderId, respondentId);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        updateApplicationRoomStatus(roomId, CHAT_ROOM_CLOSED, now);
        insertApplicationSystemMessage(roomId, "system", APPLICATION_CANCELED_MESSAGE, Map.of(), now);
    }

    @Override
    public ChatRoomParticipantSettingEntity updateRoomSettings(
            UUID roomId,
            UUID userId,
            Boolean isMuted,
            Boolean isHidden
    ) {
        ChatRoomParticipantSettingEntity setting = getOrCreateRoomSetting(roomId, userId);
        setting.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        if (isMuted != null) {
            setting.setMuted(isMuted);
        }
        if (isHidden != null) {
            setting.setHidden(isHidden);
        }
        return chatRoomParticipantSettingJpaRepository.save(setting);
    }

    @Override
    public boolean hasActiveBlockBetween(UUID userAId, UUID userBId) {
        String sql = """
                select exists(
                  select 1
                  from user_blocks
                  where revoked_at is null
                    and (
                      (blocker_id = :user_a_id and blocked_user_id = :user_b_id)
                      or (blocker_id = :user_b_id and blocked_user_id = :user_a_id)
                    )
                )
                """;
        Boolean exists = jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("user_a_id", userAId)
                        .addValue("user_b_id", userBId),
                Boolean.class
        );
        return Boolean.TRUE.equals(exists);
    }

    private ChatRoomParticipantSettingEntity getOrCreateRoomSetting(UUID roomId, UUID userId) {
        return chatRoomParticipantSettingJpaRepository.findByRoomIdAndUserId(roomId, userId)
                .orElseGet(() -> {
                    ChatRoomParticipantSettingEntity setting = new ChatRoomParticipantSettingEntity();
                    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
                    setting.setId(UUID.randomUUID());
                    setting.setRoomId(roomId);
                    setting.setUserId(userId);
                    setting.setMuted(false);
                    setting.setHidden(false);
                    setting.setCreatedAt(now);
                    setting.setUpdatedAt(now);
                    return setting;
                });
    }

    private UUID ensureApplicationRoom(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId
    ) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        int inserted = jdbcTemplate.update("""
                        insert into chat_rooms (
                          id, interview_post_id, application_id, founder_id, respondent_id,
                          status, last_message_at, created_at, updated_at
                        ) values (
                          :id, :interviewPostId, :applicationId, :founderId, :respondentId,
                          :status, :lastMessageAt, :createdAt, :updatedAt
                        )
                        on conflict (application_id) do nothing
                        """, new MapSqlParameterSource()
                .addValue("id", UUID.randomUUID())
                .addValue("interviewPostId", interviewPostId)
                .addValue("applicationId", applicationId)
                .addValue("founderId", founderId)
                .addValue("respondentId", respondentId)
                .addValue("status", CHAT_ROOM_OPEN)
                .addValue("lastMessageAt", now)
                .addValue("createdAt", now)
                .addValue("updatedAt", now));

        UUID roomId = findApplicationRoomId(applicationId)
                .orElseThrow(() -> new IllegalStateException("Expected chat room to exist for application"));
        if (inserted > 0) {
            insertApplicationSystemMessage(
                    roomId,
                    "application_created",
                    APPLICATION_CREATED_MESSAGE,
                    Map.of(),
                    now
            );
            insertApplicationRoomSetting(roomId, founderId, now);
            insertApplicationRoomSetting(roomId, respondentId, now);
        }
        return roomId;
    }

    private Optional<UUID> findApplicationRoomId(UUID applicationId) {
        return jdbcTemplate.query(
                        "select id from chat_rooms where application_id = :applicationId",
                        Map.of("applicationId", applicationId),
                        (rs, rowNum) -> rs.getObject("id", UUID.class)
                )
                .stream()
                .findFirst();
    }

    private void updateApplicationRoomStatus(UUID roomId, String status, OffsetDateTime updatedAt) {
        jdbcTemplate.update("""
                        update chat_rooms
                        set status = :status, updated_at = :updatedAt
                        where id = :roomId
                        """, Map.of(
                "status", status,
                "updatedAt", updatedAt,
                "roomId", roomId
        ));
    }

    private void insertApplicationRoomSetting(UUID roomId, UUID userId, OffsetDateTime lastReadAt) {
        jdbcTemplate.update("""
                        insert into chat_room_participant_settings (
                          id, room_id, user_id, is_muted, is_hidden,
                          last_read_at, created_at, updated_at
                        ) values (
                          :id, :roomId, :userId, false, false,
                          :lastReadAt, :createdAt, :updatedAt
                        )
                        on conflict (room_id, user_id) do nothing
                        """, new MapSqlParameterSource()
                .addValue("id", UUID.randomUUID())
                .addValue("roomId", roomId)
                .addValue("userId", userId)
                .addValue("lastReadAt", lastReadAt)
                .addValue("createdAt", lastReadAt)
                .addValue("updatedAt", lastReadAt));
    }

    private void insertApplicationSystemMessage(
            UUID roomId,
            String messageType,
            String body,
            Map<String, Object> metadata,
            OffsetDateTime createdAt
    ) {
        jdbcTemplate.update("""
                        insert into chat_messages (
                          id, room_id, sender_id, message_type, body, metadata, created_at
                        ) values (
                          :id, :roomId, null, :messageType, :body,
                          cast(:metadata as jsonb), :createdAt
                        )
                        """, new MapSqlParameterSource()
                .addValue("id", UUID.randomUUID())
                .addValue("roomId", roomId)
                .addValue("messageType", messageType)
                .addValue("body", body)
                .addValue("metadata", writeJson(metadata))
                .addValue("createdAt", createdAt));
        jdbcTemplate.update("""
                        update chat_rooms
                        set last_message_at = :lastMessageAt, updated_at = :updatedAt
                        where id = :roomId
                        """, Map.of(
                "lastMessageAt", createdAt,
                "updatedAt", createdAt,
                "roomId", roomId
        ));
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize chat metadata JSON", exception);
        }
    }

    private List<ChatRoomReadModel> attachLastMessages(List<RoomProjection> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<UUID> roomIds = rows.stream().map(RoomProjection::id).toList();
        Map<UUID, ChatMessageReadModel> lastMessages = chatMessageRepository.findLatestMessages(roomIds);
        return rows.stream()
                .map(row -> row.toReadModel(lastMessages.get(row.id())))
                .toList();
    }

    private String listRoomsSql() {
        return """
                select
                  r.id as room_id,
                  r.interview_post_id,
                  r.application_id,
                  r.founder_id,
                  r.respondent_id,
                  r.status as room_status,
                  r.last_message_at,
                  r.created_at as room_created_at,
                  r.updated_at as room_updated_at,
                  a.id as application_id_ref,
                  a.interview_post_id as application_interview_post_id,
                  a.answers as application_answers,
                  a.available_times as application_available_times,
                  a.respondent_id as application_respondent_id,
                  a.status as application_status,
                  a.rejection_reason as application_rejection_reason,
                  p.id as post_id_ref,
                  p.founder_id as post_founder_id,
                  p.title as post_title,
                  p.service_summary,
                  p.target_description,
                  p.reward_amount,
                  p.duration_minutes,
                  p.recruit_count,
                  p.interview_mode,
                  p.location,
                  p.location_text,
                  p.location_address,
                  p.location_place_name,
                  p.location_latitude,
                  p.location_longitude,
                  p.location_precision,
                  p.location_source,
                  p.schedule_options,
                  p.status as post_status,
                  founder.id as founder_user_id,
                  founder.name as founder_name,
                  founder.bio as founder_bio,
                  founder.role as founder_role,
                  founder.profile_image_url as founder_profile_image_url,
                  respondent.id as respondent_user_id,
                  respondent.name as respondent_name,
                  respondent.bio as respondent_bio,
                  respondent.role as respondent_role,
                  respondent.profile_image_url as respondent_profile_image_url,
                  setting.user_id as setting_user_id,
                  coalesce(setting.is_muted, false) as setting_is_muted,
                  coalesce(setting.is_hidden, false) as setting_is_hidden,
                  setting.last_read_at,
                  coalesce(unread.unread_count, 0) as unread_count
                from chat_rooms r
                join applications a on a.id = r.application_id
                join interview_posts p on p.id = r.interview_post_id
                left join app_users founder on founder.id = r.founder_id
                left join app_users respondent on respondent.id = r.respondent_id
                left join chat_room_participant_settings setting
                  on setting.room_id = r.id and setting.user_id = :user_id
                left join (
                  select
                    m.room_id,
                    count(m.id) as unread_count
                  from chat_messages m
                  left join chat_room_participant_settings s
                    on s.room_id = m.room_id and s.user_id = :user_id
                  where m.sender_id is not null
                    and m.sender_id <> :user_id
                    and (s.last_read_at is null or m.created_at > s.last_read_at)
                  group by m.room_id
                ) unread on unread.room_id = r.id
                where (r.founder_id = :user_id or r.respondent_id = :user_id)
                  and coalesce(setting.is_hidden, false) = false
                order by
                  case when r.last_message_at is null then 1 else 0 end,
                  r.last_message_at desc,
                  r.created_at desc
                limit 100
                """;
    }

    private String detailRoomSql() {
        return """
                select
                  r.id as room_id,
                  r.interview_post_id,
                  r.application_id,
                  r.founder_id,
                  r.respondent_id,
                  r.status as room_status,
                  r.last_message_at,
                  r.created_at as room_created_at,
                  r.updated_at as room_updated_at,
                  a.id as application_id_ref,
                  a.interview_post_id as application_interview_post_id,
                  a.answers as application_answers,
                  a.available_times as application_available_times,
                  a.respondent_id as application_respondent_id,
                  a.status as application_status,
                  a.rejection_reason as application_rejection_reason,
                  p.id as post_id_ref,
                  p.founder_id as post_founder_id,
                  p.title as post_title,
                  p.service_summary,
                  p.target_description,
                  p.reward_amount,
                  p.duration_minutes,
                  p.recruit_count,
                  p.interview_mode,
                  p.location,
                  p.location_text,
                  p.location_address,
                  p.location_place_name,
                  p.location_latitude,
                  p.location_longitude,
                  p.location_precision,
                  p.location_source,
                  p.schedule_options,
                  p.status as post_status,
                  founder.id as founder_user_id,
                  founder.name as founder_name,
                  founder.bio as founder_bio,
                  founder.role as founder_role,
                  founder.profile_image_url as founder_profile_image_url,
                  respondent.id as respondent_user_id,
                  respondent.name as respondent_name,
                  respondent.bio as respondent_bio,
                  respondent.role as respondent_role,
                  respondent.profile_image_url as respondent_profile_image_url,
                  setting.user_id as setting_user_id,
                  coalesce(setting.is_muted, false) as setting_is_muted,
                  coalesce(setting.is_hidden, false) as setting_is_hidden,
                  setting.last_read_at,
                  coalesce(unread.unread_count, 0) as unread_count
                from chat_rooms r
                join applications a on a.id = r.application_id
                join interview_posts p on p.id = r.interview_post_id
                left join app_users founder on founder.id = r.founder_id
                left join app_users respondent on respondent.id = r.respondent_id
                left join chat_room_participant_settings setting
                  on setting.room_id = r.id and setting.user_id = :user_id
                left join (
                  select
                    m.room_id,
                    count(m.id) as unread_count
                  from chat_messages m
                  left join chat_room_participant_settings s
                    on s.room_id = m.room_id and s.user_id = :user_id
                  where m.sender_id is not null
                    and m.sender_id <> :user_id
                    and (s.last_read_at is null or m.created_at > s.last_read_at)
                  group by m.room_id
                ) unread on unread.room_id = r.id
                where r.id = :room_id
                """;
    }

    private RowMapper<RoomProjection> roomProjectionRowMapper() {
        return (rs, rowNum) -> new RoomProjection(
                uuid(rs, "room_id"),
                uuid(rs, "interview_post_id"),
                uuid(rs, "application_id"),
                uuid(rs, "founder_id"),
                uuid(rs, "respondent_id"),
                rs.getString("room_status"),
                offsetDateTime(rs, "last_message_at"),
                offsetDateTime(rs, "room_created_at"),
                offsetDateTime(rs, "room_updated_at"),
                new ChatApplicationSummary(
                        uuid(rs, "application_id_ref"),
                        uuid(rs, "application_interview_post_id"),
                        readStringMap(rs, "application_answers"),
                        readStringList(rs, "application_available_times"),
                        uuid(rs, "application_respondent_id"),
                        rs.getString("application_status"),
                        rs.getString("application_rejection_reason"),
                        new ChatUserSummary(
                                uuid(rs, "respondent_user_id"),
                                rs.getString("respondent_name"),
                                rs.getString("respondent_bio"),
                                rs.getString("respondent_role"),
                                rs.getString("respondent_profile_image_url")
                        )
                ),
                new ChatInterviewPostSummary(
                        uuid(rs, "post_id_ref"),
                        uuid(rs, "post_founder_id"),
                        rs.getString("post_title"),
                        rs.getString("service_summary"),
                        rs.getString("target_description"),
                        rs.getInt("reward_amount"),
                        rs.getInt("duration_minutes"),
                        rs.getInt("recruit_count"),
                        rs.getString("interview_mode"),
                        rs.getString("location"),
                        rs.getString("location_text"),
                        rs.getString("location_address"),
                        rs.getString("location_place_name"),
                        decimal(rs, "location_latitude"),
                        decimal(rs, "location_longitude"),
                        rs.getString("location_precision"),
                        rs.getString("location_source"),
                        readStringList(rs, "schedule_options"),
                        rs.getString("post_status"),
                        null,
                        null,
                        null
                ),
                new ChatUserSummary(
                        uuid(rs, "founder_user_id"),
                        rs.getString("founder_name"),
                        rs.getString("founder_bio"),
                        rs.getString("founder_role"),
                        rs.getString("founder_profile_image_url")
                ),
                new ChatUserSummary(
                        uuid(rs, "respondent_user_id"),
                        rs.getString("respondent_name"),
                        rs.getString("respondent_bio"),
                        rs.getString("respondent_role"),
                        rs.getString("respondent_profile_image_url")
                ),
                rs.getInt("unread_count"),
                rs.getBoolean("setting_is_muted"),
                rs.getBoolean("setting_is_hidden"),
                offsetDateTime(rs, "last_read_at")
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

    private Double decimal(ResultSet rs, String column) throws SQLException {
        BigDecimal value = rs.getBigDecimal(column);
        return value == null ? null : value.doubleValue();
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

    private record RoomProjection(
            UUID id,
            UUID interviewPostId,
            UUID applicationId,
            UUID founderId,
            UUID respondentId,
            String status,
            OffsetDateTime lastMessageAt,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            ChatApplicationSummary application,
            ChatInterviewPostSummary interviewPost,
            ChatUserSummary founder,
            ChatUserSummary respondent,
            int unreadCount,
            boolean isMuted,
            boolean isHidden,
            OffsetDateTime lastReadAt
    ) {
        ChatRoomReadModel toReadModel(ChatMessageReadModel lastMessage) {
            return new ChatRoomReadModel(
                    id,
                    interviewPostId,
                    applicationId,
                    founderId,
                    respondentId,
                    status,
                    lastMessageAt,
                    createdAt,
                    updatedAt,
                    application,
                    interviewPost,
                    founder,
                    respondent,
                    lastMessage,
                    unreadCount,
                    isMuted,
                    isHidden,
                    lastReadAt
            );
        }
    }
}
