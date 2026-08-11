package com.contentruck.hypofit.audit.persistence;

import com.contentruck.hypofit.audit.application.AuditEventCommand;
import com.contentruck.hypofit.audit.application.AuditWriteRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuditWriteRepositoryAdapter implements AuditWriteRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AuditWriteRepositoryAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void record(AuditEventCommand command) {
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
                .addValue("actorUserId", command.actorUserId())
                .addValue("actorType", command.actorType())
                .addValue("eventType", command.eventType())
                .addValue("targetType", command.targetType())
                .addValue("targetId", command.targetId())
                .addValue("before", writeNullableJson(command.before()))
                .addValue("after", writeNullableJson(command.after()))
                .addValue("reason", command.reason())
                .addValue("metadata", writeJson(command.metadata())));
    }

    private String writeNullableJson(Map<String, Object> value) {
        return value == null ? null : writeJson(value);
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize audit event JSON", exception);
        }
    }
}
