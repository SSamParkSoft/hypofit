package com.contentruck.hypofit.maintenance.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.notice.service.NoticeService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock
    private MaintenanceRepository repository;

    @Mock
    private AuditWriteService audit;

    @Mock
    private NoticeService noticeService;

    private MaintenanceService service;

    @BeforeEach
    void setUp() {
        service = new MaintenanceService(repository, audit, noticeService);
    }

    @Test
    void emergencyStartCreatesAnActiveFullMaintenanceAndAuditsIt() {
        UUID actor = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        MaintenanceRepository.WriteCommand command = new MaintenanceRepository.WriteCommand(
                "긴급 시스템 점검",
                "안정적인 서비스 제공을 위해 긴급 점검을 진행하고 있어요.",
                now,
                now.plusHours(1),
                false,
                null
        );
        MaintenanceRepository.MaintenanceRecord expected = record(maintenanceId, command, "IN_PROGRESS", now);
        when(repository.createInProgress(any(), any(), any())).thenReturn(expected);

        MaintenanceRepository.MaintenanceRecord actual = service.emergencyStart(actor, command, false);

        assertThat(actual.status()).isEqualTo("IN_PROGRESS");
        verify(repository).createInProgress(any(), any(), any());
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(audit).record(auditCaptor.capture());
        assertThat(auditCaptor.getValue().eventType()).isEqualTo("MAINTENANCE_EMERGENCY_STARTED");
        assertThat(auditCaptor.getValue().targetId()).isEqualTo(maintenanceId);
    }

    private MaintenanceRepository.MaintenanceRecord record(
            UUID id,
            MaintenanceRepository.WriteCommand command,
            String status,
            OffsetDateTime now
    ) {
        return new MaintenanceRepository.MaintenanceRecord(
                id,
                command.title(),
                command.message(),
                status,
                "FULL",
                command.startsAt(),
                command.endsAt(),
                null,
                false,
                null,
                UUID.randomUUID(),
                UUID.randomUUID(),
                now,
                null,
                0,
                now,
                now
        );
    }
}
