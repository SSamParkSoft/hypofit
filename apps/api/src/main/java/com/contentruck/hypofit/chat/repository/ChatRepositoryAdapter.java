package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatInterviewSessionEntity;
import com.contentruck.hypofit.chat.entity.ChatMessageEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;

import com.contentruck.hypofit.chat.service.ChatRepository;
import com.contentruck.hypofit.chat.service.ChatApplicationSummary;
import com.contentruck.hypofit.chat.service.ChatInterviewPostSummary;
import com.contentruck.hypofit.chat.service.ChatMessageReadModel;
import com.contentruck.hypofit.chat.service.ChatRoomReadModel;
import com.contentruck.hypofit.chat.service.ChatUserSummary;
import com.contentruck.hypofit.session.service.SessionReadModels;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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
    private static final TypeReference<Map<String, Object>> OBJECT_MAP_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ChatRoomJpaRepository chatRoomJpaRepository;
    private final ChatMessageJpaRepository chatMessageJpaRepository;
    private final ChatRoomParticipantSettingJpaRepository chatRoomParticipantSettingJpaRepository;
    private final ChatUserAccountJpaRepository chatUserAccountJpaRepository;
    private final ChatApplicationJpaRepository chatApplicationJpaRepository;
    private final ChatInterviewSessionJpaRepository chatInterviewSessionJpaRepository;
    public ChatRepositoryAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            ChatRoomJpaRepository chatRoomJpaRepository,
            ChatMessageJpaRepository chatMessageJpaRepository,
            ChatRoomParticipantSettingJpaRepository chatRoomParticipantSettingJpaRepository,
            ChatUserAccountJpaRepository chatUserAccountJpaRepository,
            ChatApplicationJpaRepository chatApplicationJpaRepository,
            ChatInterviewSessionJpaRepository chatInterviewSessionJpaRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.chatRoomJpaRepository = chatRoomJpaRepository;
        this.chatMessageJpaRepository = chatMessageJpaRepository;
        this.chatRoomParticipantSettingJpaRepository = chatRoomParticipantSettingJpaRepository;
        this.chatUserAccountJpaRepository = chatUserAccountJpaRepository;
        this.chatApplicationJpaRepository = chatApplicationJpaRepository;
        this.chatInterviewSessionJpaRepository = chatInterviewSessionJpaRepository;
    }

    @Override
    public List<ChatRoomReadModel> findRoomsForUser(UUID userId, String role) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("user_id", userId)
                .addValue("respondent_only", "respondent".equals(role));
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
    public List<ChatMessageReadModel> findMessages(
            UUID roomId,
            int limit,
            OffsetDateTime before,
            UUID beforeId
    ) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("room_id", roomId)
                .addValue("limit", limit)
                .addValue("before", before)
                .addValue("before_id", beforeId);
        List<ChatMessageReadModel> descending = jdbcTemplate.query(
                messagesSql(before != null, beforeId != null),
                parameters,
                messageRowMapper()
        );
        List<ChatMessageReadModel> ascending = new ArrayList<>(descending);
        java.util.Collections.reverse(ascending);
        return ascending;
    }

    @Override
    public Optional<ChatMessageEntity> findMessage(UUID roomId, UUID messageId) {
        return chatMessageJpaRepository.findByRoomIdAndId(roomId, messageId);
    }

    @Override
    public Optional<ChatMessageEntity> findMessageByClientMessageId(
            UUID roomId,
            UUID senderId,
            String clientMessageId
    ) {
        return chatMessageJpaRepository.findByRoomIdAndSenderIdAndClientMessageId(roomId, senderId, clientMessageId);
    }

    @Override
    public CreateUserMessageResult createUserMessage(
            ChatRoomEntity room,
            UUID senderId,
            String body,
            String clientMessageId
    ) {
        UUID messageId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("id", messageId)
                .addValue("roomId", room.getId())
                .addValue("senderId", senderId)
                .addValue("body", body)
                .addValue("clientMessageId", clientMessageId)
                .addValue("createdAt", createdAt);
        Optional<ChatMessageEntity> inserted = jdbcTemplate.query(
                        """
                        insert into chat_messages (
                          id, room_id, sender_id, message_type, body,
                          client_message_id, metadata, created_at
                        ) values (
                          :id, :roomId, :senderId, 'user', :body,
                          :clientMessageId, '{}'::jsonb, :createdAt
                        )
                        on conflict (room_id, sender_id, client_message_id)
                          where client_message_id is not null
                        do nothing
                        returning id, room_id, sender_id, message_type, body,
                                  client_message_id, created_at
                        """,
                        parameters,
                        (resultSet, rowNum) -> userMessageEntity(resultSet)
                )
                .stream()
                .findFirst();
        if (inserted.isPresent()) {
            jdbcTemplate.update(
                    """
                    update chat_rooms
                    set last_message_at = :createdAt, updated_at = :createdAt
                    where id = :roomId
                    """,
                    parameters
            );
            return new CreateUserMessageResult(inserted.get(), true);
        }
        ChatMessageEntity existing = findMessageByClientMessageId(room.getId(), senderId, clientMessageId)
                .orElseThrow(() -> new IllegalStateException("Expected idempotent chat message to exist"));
        return new CreateUserMessageResult(existing, false);
    }

    private ChatMessageEntity userMessageEntity(ResultSet resultSet) throws SQLException {
        ChatMessageEntity message = new ChatMessageEntity();
        message.setId(resultSet.getObject("id", UUID.class));
        message.setRoomId(resultSet.getObject("room_id", UUID.class));
        message.setSenderId(resultSet.getObject("sender_id", UUID.class));
        message.setMessageType(resultSet.getString("message_type"));
        message.setBody(resultSet.getString("body"));
        message.setClientMessageId(resultSet.getString("client_message_id"));
        message.setMetadata(new LinkedHashMap<>());
        message.setCreatedAt(resultSet.getObject("created_at", OffsetDateTime.class));
        return message;
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
    public ChatRoomParticipantSettingEntity markRoomRead(
            UUID roomId,
            UUID userId,
            OffsetDateTime readAt
    ) {
        ChatRoomParticipantSettingEntity setting = getOrCreateRoomSetting(roomId, userId);
        setting.setLastReadAt(readAt);
        setting.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
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

    @Override
    public Optional<ApplicationMessageabilityRecord> findApplicationMessageability(UUID applicationId) {
        return chatApplicationJpaRepository.findById(applicationId)
                .map(application -> new ApplicationMessageabilityRecord(application.getId(), application.getStatus()));
    }

    @Override
    public Optional<String> findLatestVisibleSessionStatus(UUID applicationId) {
        return chatInterviewSessionJpaRepository
                .findFirstByApplicationIdAndModerationStatusOrderByCreatedAtDescIdDesc(applicationId, "visible")
                .map(ChatInterviewSessionEntity::getStatus);
    }

    @Override
    public Optional<ChatRoomWorkflowContextRecord> findRoomWorkflowContext(UUID roomId) {
        List<ChatRoomWorkflowContextRecord> results = jdbcTemplate.query(
                roomWorkflowContextSql(),
                new MapSqlParameterSource("room_id", roomId),
                roomWorkflowContextRowMapper()
        );
        return results.stream().findFirst();
    }

    @Override
    public Optional<SessionReadModels.AttendanceRecordReadModel> findAttendanceRecord(UUID sessionId) {
        List<SessionReadModels.AttendanceRecordReadModel> results = jdbcTemplate.query(
                """
                        select
                          session_id,
                          founder_confirmed,
                          respondent_confirmed,
                          founder_confirmed_at,
                          respondent_confirmed_at,
                          completed_at,
                          no_show_party
                        from attendance_records
                        where session_id = :session_id
                        """,
                new MapSqlParameterSource("session_id", sessionId),
                attendanceRecordRowMapper()
        );
        return results.stream().findFirst();
    }

    @Override
    public Optional<SessionReadModels.RewardConfirmationReadModel> findRewardConfirmation(UUID sessionId) {
        List<SessionReadModels.RewardConfirmationReadModel> results = jdbcTemplate.query(
                """
                        select
                          id,
                          session_id,
                          application_id,
                          founder_id,
                          respondent_id,
                          amount,
                          status,
                          founder_marked_paid_at,
                          respondent_confirmed_at,
                          disputed_at,
                          dispute_reason,
                          created_at,
                          updated_at
                        from reward_confirmations
                        where session_id = :session_id
                        """,
                new MapSqlParameterSource("session_id", sessionId),
                rewardConfirmationRowMapper()
        );
        return results.stream().findFirst();
    }

    @Override
    public List<SessionReadModels.InterviewReviewReadModel> findReviews(UUID sessionId) {
        return jdbcTemplate.query(
                """
                        select
                          id,
                          session_id,
                          reviewer_id,
                          reviewee_id,
                          reviewer_role,
                          rating,
                          tags,
                          comment,
                          visibility,
                          created_at,
                          updated_at
                        from interview_reviews
                        where session_id = :session_id
                        order by created_at asc, id asc
                        """,
                new MapSqlParameterSource("session_id", sessionId),
                interviewReviewRowMapper()
        );
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
        Map<UUID, ChatMessageReadModel> lastMessages = loadLastMessages(roomIds);
        return rows.stream()
                .map(row -> row.toReadModel(lastMessages.get(row.id())))
                .toList();
    }

    private Map<UUID, ChatMessageReadModel> loadLastMessages(List<UUID> roomIds) {
        if (roomIds.isEmpty()) {
            return Map.of();
        }
        String sql = """
                select distinct on (m.room_id)
                  m.id,
                  m.room_id,
                  m.sender_id,
                  m.message_type,
                  m.body,
                  m.client_message_id,
                  m.metadata,
                  m.hidden_at,
                  m.hidden_reason,
                  m.created_at
                from chat_messages m
                where m.room_id in (:room_ids)
                order by m.room_id, m.created_at desc, m.id desc
                """;
        List<ChatMessageReadModel> messages = jdbcTemplate.query(
                sql,
                new MapSqlParameterSource("room_ids", roomIds),
                messageRowMapper()
        );
        Map<UUID, ChatMessageReadModel> mapped = new LinkedHashMap<>();
        for (ChatMessageReadModel message : messages) {
            mapped.put(message.roomId(), message);
        }
        return mapped;
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
                where (
                  (:respondent_only = true and r.respondent_id = :user_id)
                  or (:respondent_only = false and (r.founder_id = :user_id or r.respondent_id = :user_id))
                )
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

    private String messagesSql(boolean includeBefore, boolean includeBeforeId) {
        StringBuilder sql = new StringBuilder("""
                select
                  m.id,
                  m.room_id,
                  m.sender_id,
                  m.message_type,
                  m.body,
                  m.client_message_id,
                  m.metadata,
                  m.hidden_at,
                  m.hidden_reason,
                  m.created_at
                from chat_messages m
                where m.room_id = :room_id
                """);
        if (includeBefore && includeBeforeId) {
            sql.append("""

                    and (
                      m.created_at < :before
                      or (m.created_at = :before and m.id < :before_id)
                    )
                    """);
        } else if (includeBefore) {
            sql.append("\nand m.created_at < :before\n");
        }
        sql.append("""
                order by m.created_at desc, m.id desc
                limit :limit
                """);
        return sql.toString();
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

    private RowMapper<ChatRoomWorkflowContextRecord> roomWorkflowContextRowMapper() {
        return (rs, rowNum) -> {
            SessionReadModels.ApplicationReadModel application = null;
            UUID applicationId = uuidNullable(rs, "application_id_ref");
            if (applicationId != null) {
                application = new SessionReadModels.ApplicationReadModel(
                        applicationId,
                        uuid(rs, "application_interview_post_id"),
                        readStringMap(rs, "application_answers"),
                        readStringList(rs, "application_available_times"),
                        uuid(rs, "application_respondent_id"),
                        rs.getString("application_status"),
                        rs.getString("application_rejection_reason"),
                        new SessionReadModels.UserSummary(
                                uuidNullable(rs, "respondent_user_id"),
                                rs.getString("respondent_name"),
                                rs.getString("respondent_bio"),
                                rs.getString("respondent_role"),
                                rs.getString("respondent_profile_image_url")
                        )
                );
            }

            SessionReadModels.InterviewSessionReadModel latestSession = null;
            UUID sessionId = uuidNullable(rs, "session_id_ref");
            if (sessionId != null) {
                latestSession = new SessionReadModels.InterviewSessionReadModel(
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

    private RowMapper<ChatMessageReadModel> messageRowMapper() {
        return (rs, rowNum) -> new ChatMessageReadModel(
                uuid(rs, "id"),
                uuid(rs, "room_id"),
                uuidNullable(rs, "sender_id"),
                rs.getString("message_type"),
                rs.getString("body"),
                rs.getString("client_message_id"),
                readObjectMap(rs, "metadata"),
                offsetDateTime(rs, "hidden_at"),
                rs.getString("hidden_reason"),
                offsetDateTime(rs, "created_at")
        );
    }

    private RowMapper<SessionReadModels.AttendanceRecordReadModel> attendanceRecordRowMapper() {
        return (rs, rowNum) -> new SessionReadModels.AttendanceRecordReadModel(
                uuid(rs, "session_id"),
                rs.getBoolean("founder_confirmed"),
                rs.getBoolean("respondent_confirmed"),
                offsetDateTime(rs, "founder_confirmed_at"),
                offsetDateTime(rs, "respondent_confirmed_at"),
                offsetDateTime(rs, "completed_at"),
                rs.getString("no_show_party")
        );
    }

    private RowMapper<SessionReadModels.RewardConfirmationReadModel> rewardConfirmationRowMapper() {
        return (rs, rowNum) -> new SessionReadModels.RewardConfirmationReadModel(
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

    private RowMapper<SessionReadModels.InterviewReviewReadModel> interviewReviewRowMapper() {
        return (rs, rowNum) -> new SessionReadModels.InterviewReviewReadModel(
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

    private Map<String, Object> readObjectMap(ResultSet rs, String column) throws SQLException {
        String raw = rawJson(rs, column);
        if (raw == null || raw.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(raw, OBJECT_MAP_TYPE);
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
