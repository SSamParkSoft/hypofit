package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatMessageEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;
import com.contentruck.hypofit.chat.service.ChatMessageReadModel;
import com.contentruck.hypofit.chat.service.ChatMessageRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class ChatMessageRepositoryAdapter implements ChatMessageRepository {

    private static final TypeReference<Map<String, Object>> OBJECT_MAP_TYPE = new TypeReference<>() {
    };

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ChatMessageJpaRepository chatMessageJpaRepository;
    private final ChatRoomParticipantSettingJpaRepository chatRoomParticipantSettingJpaRepository;
    private final ObjectMapper objectMapper;

    public ChatMessageRepositoryAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ChatMessageJpaRepository chatMessageJpaRepository,
            ChatRoomParticipantSettingJpaRepository chatRoomParticipantSettingJpaRepository,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.chatMessageJpaRepository = chatMessageJpaRepository;
        this.chatRoomParticipantSettingJpaRepository = chatRoomParticipantSettingJpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<ChatMessageReadModel> findMessages(UUID roomId, int limit, OffsetDateTime before, UUID beforeId) {
        List<ChatMessageReadModel> descending = jdbcTemplate.query(
                messagesSql(before != null, beforeId != null),
                new MapSqlParameterSource()
                        .addValue("room_id", roomId)
                        .addValue("limit", limit)
                        .addValue("before", before)
                        .addValue("before_id", beforeId),
                messageRowMapper()
        );
        List<ChatMessageReadModel> ascending = new ArrayList<>(descending);
        java.util.Collections.reverse(ascending);
        return ascending;
    }

    @Override
    public Map<UUID, ChatMessageReadModel> findLatestMessages(List<UUID> roomIds) {
        if (roomIds.isEmpty()) {
            return Map.of();
        }
        List<ChatMessageReadModel> messages = jdbcTemplate.query(
                """
                select distinct on (m.room_id)
                  m.id, m.room_id, m.sender_id, m.message_type, m.body,
                  m.client_message_id, m.metadata, m.hidden_at, m.hidden_reason, m.created_at
                from chat_messages m
                where m.room_id in (:room_ids)
                order by m.room_id, m.created_at desc, m.id desc
                """,
                new MapSqlParameterSource("room_ids", roomIds),
                messageRowMapper()
        );
        Map<UUID, ChatMessageReadModel> mapped = new LinkedHashMap<>();
        for (ChatMessageReadModel message : messages) {
            mapped.put(message.roomId(), message);
        }
        return mapped;
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
                        -- The client can retry after a network timeout. The unique key keeps that retry from duplicating a message.
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

    @Override
    public ChatRoomParticipantSettingEntity markRoomRead(UUID roomId, UUID userId, OffsetDateTime readAt) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcTemplate.update("""
                        -- A delayed poll must never make a user's read cursor move backwards.
                        insert into chat_room_participant_settings (
                          id, room_id, user_id, is_muted, is_hidden,
                          last_read_at, created_at, updated_at
                        ) values (
                          :id, :roomId, :userId, false, false,
                          :readAt, :createdAt, :updatedAt
                        )
                        on conflict (room_id, user_id) do update
                        set last_read_at = case
                              when chat_room_participant_settings.last_read_at is null
                                or excluded.last_read_at > chat_room_participant_settings.last_read_at
                              then excluded.last_read_at
                              else chat_room_participant_settings.last_read_at
                            end,
                            updated_at = excluded.updated_at
                        """, new MapSqlParameterSource()
                .addValue("id", UUID.randomUUID())
                .addValue("roomId", roomId)
                .addValue("userId", userId)
                .addValue("readAt", readAt)
                .addValue("createdAt", now)
                .addValue("updatedAt", now));
        return chatRoomParticipantSettingJpaRepository.findByRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new IllegalStateException("Expected chat room setting to exist"));
    }

    private String messagesSql(boolean includeBefore, boolean includeBeforeId) {
        StringBuilder sql = new StringBuilder("""
                select m.id, m.room_id, m.sender_id, m.message_type, m.body,
                       m.client_message_id, m.metadata, m.hidden_at, m.hidden_reason, m.created_at
                from chat_messages m
                where m.room_id = :room_id
                """);
        if (includeBefore && includeBeforeId) {
            sql.append("""

                    and (m.created_at < :before or (m.created_at = :before and m.id < :before_id))
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

    private ChatMessageEntity userMessageEntity(ResultSet resultSet) throws SQLException {
        ChatMessageEntity message = new ChatMessageEntity();
        message.setId(uuid(resultSet, "id"));
        message.setRoomId(uuid(resultSet, "room_id"));
        message.setSenderId(uuidNullable(resultSet, "sender_id"));
        message.setMessageType(resultSet.getString("message_type"));
        message.setBody(resultSet.getString("body"));
        message.setClientMessageId(resultSet.getString("client_message_id"));
        message.setMetadata(new LinkedHashMap<>());
        message.setCreatedAt(offsetDateTime(resultSet, "created_at"));
        return message;
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

    private UUID uuid(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    private UUID uuidNullable(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    private OffsetDateTime offsetDateTime(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, OffsetDateTime.class);
    }

    private String rawJson(ResultSet rs, String column) throws SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : value.toString();
    }
}
