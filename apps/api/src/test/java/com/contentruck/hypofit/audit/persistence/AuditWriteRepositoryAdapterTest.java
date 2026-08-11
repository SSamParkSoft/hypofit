package com.contentruck.hypofit.audit.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import com.contentruck.hypofit.audit.application.AuditEventCommand;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

@ExtendWith(MockitoExtension.class)
class AuditWriteRepositoryAdapterTest {

    @Mock
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Test
    void recordWritesNullableSnapshotsAndMetadataAsJson() {
        UUID actorId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        AuditEventCommand command = new AuditEventCommand(
                actorId,
                "user",
                "interview_post_closed",
                "interview_post",
                targetId,
                Map.of("status", "open"),
                Map.of("status", "closed"),
                null,
                Map.of("founder_id", actorId.toString())
        );

        new AuditWriteRepositoryAdapter(jdbcTemplate, new ObjectMapper()).record(command);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> parameters = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbcTemplate).update(sql.capture(), parameters.capture());

        assertThat(sql.getValue()).contains("insert into audit_events");
        assertThat(parameters.getValue().getValue("actorUserId")).isEqualTo(actorId);
        assertThat(parameters.getValue().getValue("targetId")).isEqualTo(targetId);
        assertThat(parameters.getValue().getValue("before")).isEqualTo("{\"status\":\"open\"}");
        assertThat(parameters.getValue().getValue("after")).isEqualTo("{\"status\":\"closed\"}");
        assertThat(parameters.getValue().getValue("metadata"))
                .isEqualTo("{\"founder_id\":\"%s\"}".formatted(actorId));
    }
}
