package com.contentruck.hypofit.admin.repository;

import com.contentruck.hypofit.admin.service.AdminSupportRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
public class AdminSupportPersistenceAdapter implements AdminSupportRepository {

    private static final TypeReference<Map<String, Object>> OBJECT_MAP_TYPE = new TypeReference<>() {
    };
    private static final RowMapper<SupportTicketRecord> SUPPORT_TICKET_ROW_MAPPER =
            AdminSupportPersistenceAdapter::mapSupportTicket;
    private static final RowMapper<SupportTicketEventRecord> SUPPORT_TICKET_EVENT_ROW_MAPPER =
            AdminSupportPersistenceAdapter::mapSupportTicketEvent;

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AdminSupportPersistenceAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<SupportTicketRecord> listTickets(String kind, String status, Boolean deletedByUser, int limit,
                                                int offset, String search, boolean excludeReports) {
        StringBuilder sql = new StringBuilder("""
                select
                  id,
                  user_id,
                  kind,
                  category,
                  subject,
                  body,
                  contact_email,
                  target_type,
                  target_id,
                  status,
                  deleted_by_user_at,
                  metadata::text as metadata_json,
                  created_at,
                  updated_at
                from support_tickets
                where id is not null
                """);
        MapSqlParameterSource parameters = new MapSqlParameterSource();
        if (excludeReports) {
            sql.append(" and kind <> 'report'");
        }
        if (search != null && !search.isBlank()) {
            sql.append(" and (coalesce(subject, '') ilike :search or body ilike :search or contact_email ilike :search"
                    + " or id::text ilike :search or user_id::text ilike :search or target_id::text ilike :search or category ilike :search)");
            parameters.addValue("search", "%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        if (kind != null) {
            sql.append(" and kind = :kind");
            parameters.addValue("kind", kind);
        }
        if (status != null) {
            sql.append(" and status = :status");
            parameters.addValue("status", status);
        }
        if (Boolean.TRUE.equals(deletedByUser)) {
            sql.append(" and deleted_by_user_at is not null");
        } else if (Boolean.FALSE.equals(deletedByUser)) {
            sql.append(" and deleted_by_user_at is null");
        }
        sql.append(" order by created_at desc, id desc limit :limit offset :offset");
        parameters.addValue("limit", limit);
        parameters.addValue("offset", offset);
        return jdbcTemplate.query(sql.toString(), parameters, SUPPORT_TICKET_ROW_MAPPER);
    }

    @Override
    public Optional<SupportTicketRecord> findTicket(UUID ticketId) {
        return jdbcTemplate.query("""
                        select
                          id,
                          user_id,
                          kind,
                          category,
                          subject,
                          body,
                          contact_email,
                          target_type,
                          target_id,
                          status,
                          deleted_by_user_at,
                          metadata::text as metadata_json,
                          created_at,
                          updated_at
                        from support_tickets
                        where id = :ticketId
                        limit 1
                        """, Map.of("ticketId", ticketId), SUPPORT_TICKET_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public Map<UUID, List<SupportTicketEventRecord>> listTicketEvents(List<UUID> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            return Map.of();
        }
        List<SupportTicketEventRecord> events = jdbcTemplate.query("""
                        select
                          id,
                          ticket_id,
                          actor_user_id,
                          actor_type,
                          event_type,
                          from_status,
                          to_status,
                          message,
                          metadata::text as metadata_json,
                          created_at
                        from support_ticket_events
                        where ticket_id in (:ticketIds)
                        order by created_at asc
                        """, Map.of("ticketIds", ticketIds), SUPPORT_TICKET_EVENT_ROW_MAPPER);
        Map<UUID, List<SupportTicketEventRecord>> grouped = new LinkedHashMap<>();
        for (SupportTicketEventRecord event : events) {
            grouped.computeIfAbsent(event.ticketId(), ignored -> new java.util.ArrayList<>()).add(event);
        }
        return grouped;
    }

    @Override
    public SupportTicketRecord updateStatus(UUID ticketId, UUID actorUserId, String fromStatus, String status, String reason) {
        OffsetDateTime updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime eventCreatedAt = updatedAt;

        int changed = jdbcTemplate.update("""
                        update support_tickets
                        set status = :status,
                            updated_at = :updatedAt
                        where id = :ticketId and status = :fromStatus
                        """, Map.of(
                        "status", status,
                        "updatedAt", updatedAt,
                        "ticketId", ticketId,
                        "fromStatus", fromStatus
                ));
        if (changed == 0) {
            throw new com.contentruck.hypofit.common.error.HypofitException(
                    "support_state_conflict", "다른 운영자가 상태를 변경했어요. 새로고침해 주세요.", 409, "Support status conflict");
        }

        jdbcTemplate.update("""
                        insert into support_ticket_events (
                          id,
                          ticket_id,
                          actor_user_id,
                          actor_type,
                          event_type,
                          from_status,
                          to_status,
                          message,
                          metadata,
                          created_at
                        ) values (
                          :id,
                          :ticketId,
                          :actorUserId,
                          'operator',
                          'status_changed',
                          :fromStatus,
                          :toStatus,
                          :message,
                          cast(:metadata as jsonb),
                          :createdAt
                        )
                        """, new MapSqlParameterSource()
                        .addValue("id", UUID.randomUUID())
                        .addValue("ticketId", ticketId)
                        .addValue("actorUserId", actorUserId)
                        .addValue("fromStatus", fromStatus)
                        .addValue("toStatus", status)
                        .addValue("message", reason)
                        .addValue("metadata", writeJson(Map.of()))
                        .addValue("createdAt", eventCreatedAt));

        return findTicket(ticketId).orElseThrow();
    }

    @Override
    public SupportTicketEventRecord addReply(UUID ticketId, UUID actorUserId, String body, boolean visibleToUser, String status) {
        UUID eventId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        Map<String, Object> metadata = Map.of("visible_to_user", visibleToUser);

        jdbcTemplate.update("""
                        insert into support_ticket_events (
                          id,
                          ticket_id,
                          actor_user_id,
                          actor_type,
                          event_type,
                          from_status,
                          to_status,
                          message,
                          metadata,
                          created_at
                        ) values (
                          :id,
                          :ticketId,
                          :actorUserId,
                          'operator',
                          'operator_replied',
                          null,
                          :toStatus,
                          :message,
                          cast(:metadata as jsonb),
                          :createdAt
                        )
                        """, Map.of(
                        "id", eventId,
                        "ticketId", ticketId,
                        "actorUserId", actorUserId,
                        "toStatus", status,
                        "message", body,
                        "metadata", writeJson(metadata),
                        "createdAt", createdAt
                ));

        return new SupportTicketEventRecord(
                eventId,
                ticketId,
                actorUserId,
                "operator",
                "operator_replied",
                null,
                status,
                body,
                metadata,
                createdAt
        );
    }

    @Override
    public void recordAuditEvent(
            UUID actorUserId,
            String actorType,
            String eventType,
            String targetType,
            UUID targetId,
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
                          reason,
                          metadata
                        ) values (
                          :id,
                          :actorUserId,
                          :actorType,
                          :eventType,
                          :targetType,
                          :targetId,
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
                        .addValue("reason", reason)
                        .addValue("metadata", writeJson(metadata == null ? Map.of() : metadata)));
    }

    private static SupportTicketRecord mapSupportTicket(ResultSet resultSet, int rowNum) throws SQLException {
        return new SupportTicketRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("user_id", UUID.class),
                resultSet.getString("kind"),
                resultSet.getString("category"),
                resultSet.getString("subject"),
                resultSet.getString("body"),
                resultSet.getString("contact_email"),
                resultSet.getString("target_type"),
                resultSet.getObject("target_id", UUID.class),
                resultSet.getString("status"),
                resultSet.getObject("deleted_by_user_at", OffsetDateTime.class),
                readObjectMap(resultSet.getString("metadata_json")),
                resultSet.getObject("created_at", OffsetDateTime.class),
                resultSet.getObject("updated_at", OffsetDateTime.class)
        );
    }

    private static SupportTicketEventRecord mapSupportTicketEvent(ResultSet resultSet, int rowNum) throws SQLException {
        return new SupportTicketEventRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("ticket_id", UUID.class),
                resultSet.getObject("actor_user_id", UUID.class),
                resultSet.getString("actor_type"),
                resultSet.getString("event_type"),
                resultSet.getString("from_status"),
                resultSet.getString("to_status"),
                resultSet.getString("message"),
                readObjectMap(resultSet.getString("metadata_json")),
                resultSet.getObject("created_at", OffsetDateTime.class)
        );
    }

    private static Map<String, Object> readObjectMap(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Map.of();
        }
        try {
            return new ObjectMapper().readValue(rawJson, OBJECT_MAP_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to deserialize object map JSON", exception);
        }
    }

    private String writeJson(Map<String, Object> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata == null ? Map.of() : metadata);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize audit metadata JSON", exception);
        }
    }
}
