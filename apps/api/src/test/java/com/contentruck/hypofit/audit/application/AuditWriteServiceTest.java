package com.contentruck.hypofit.audit.application;

import static org.mockito.Mockito.verify;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuditWriteServiceTest {

    @Mock
    private AuditWriteRepository repository;

    @Test
    void recordDelegatesNormalizedCommand() {
        AuditEventCommand command = new AuditEventCommand(
                UUID.randomUUID(),
                "user",
                "application_withdrawn",
                "application",
                UUID.randomUUID(),
                Map.of("status", "selected"),
                Map.of("status", "canceled"),
                null,
                null
        );

        new AuditWriteService(repository).record(command);

        verify(repository).record(command);
    }
}
