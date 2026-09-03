package com.contentruck.hypofit.maintenance.service;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.notice.service.NoticeRepository;
import com.contentruck.hypofit.notice.service.NoticeService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MaintenanceService {
    private final MaintenanceRepository repository;
    private final AuditWriteService audit;
    private final NoticeService noticeService;

    public MaintenanceService(
            MaintenanceRepository repository,
            AuditWriteService audit,
            NoticeService noticeService
    ) {
        this.repository = repository;
        this.audit = audit;
        this.noticeService = noticeService;
    }

    @Transactional(readOnly = true)
    public List<MaintenanceRepository.MaintenanceRecord> list() {
        return repository.list();
    }

    @Transactional(readOnly = true)
    public MaintenanceRepository.MaintenanceRecord get(UUID id) {
        return repository.find(id).orElseThrow(this::notFound);
    }

    @Transactional(readOnly = true)
    public MaintenanceRepository.MaintenanceRecord active() {
        return repository.findActive().orElse(null);
    }

    @Transactional(readOnly = true)
    public MaintenanceRepository.MaintenanceRecord visibleScheduled() {
        return repository.findVisibleScheduled(OffsetDateTime.now(ZoneOffset.UTC)).orElse(null);
    }

    @Transactional
    public MaintenanceRepository.MaintenanceRecord create(
            UUID actor,
            MaintenanceRepository.WriteCommand command,
            boolean createNotice
    ) {
        validate(command);
        MaintenanceRepository.MaintenanceRecord maintenance = repository.create(actor, command);
        if (createNotice) {
            NoticeRepository.NoticeRecord notice = noticeService.create(
                    actor,
                    new NoticeRepository.NoticeWriteCommand("MAINTENANCE", command.title(), renderedNoticeBody(command))
            );
            noticeService.publish(actor, notice.id());
            repository.linkNotice(maintenance.id(), notice.id());
            maintenance = get(maintenance.id());
        }
        audit(actor, "MAINTENANCE_CREATED", maintenance);
        return maintenance;
    }

    @Transactional
    public MaintenanceRepository.MaintenanceRecord update(
            UUID actor,
            UUID id,
            MaintenanceRepository.WriteCommand command
    ) {
        validate(command);
        get(id);
        MaintenanceRepository.MaintenanceRecord maintenance = repository.update(id, actor, command);
        if (maintenance == null) {
            throw conflict();
        }
        audit(actor, "MAINTENANCE_UPDATED", maintenance);
        return maintenance;
    }

    @Transactional
    public MaintenanceRepository.MaintenanceRecord start(UUID actor, UUID id) {
        return transition(actor, id, "SCHEDULED", "IN_PROGRESS", "MAINTENANCE_STARTED");
    }

    @Transactional
    public MaintenanceRepository.MaintenanceRecord emergencyStart(
            UUID actor,
            MaintenanceRepository.WriteCommand command,
            boolean createNotice
    ) {
        validate(command);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        try {
            MaintenanceRepository.MaintenanceRecord maintenance = repository.createInProgress(actor, command, now);
            if (createNotice) {
                NoticeRepository.NoticeRecord notice = noticeService.create(
                        actor,
                        new NoticeRepository.NoticeWriteCommand(
                                "MAINTENANCE",
                                command.title(),
                                renderedNoticeBody(command, true)
                        )
                );
                noticeService.publish(actor, notice.id());
                repository.linkNotice(maintenance.id(), notice.id());
                maintenance = get(maintenance.id());
            }
            audit(actor, "MAINTENANCE_EMERGENCY_STARTED", maintenance);
            return maintenance;
        } catch (DataIntegrityViolationException exception) {
            throw conflict();
        }
    }

    @Transactional
    public MaintenanceRepository.MaintenanceRecord verify(UUID actor, UUID id) {
        return transition(actor, id, "IN_PROGRESS", "VERIFYING", "MAINTENANCE_VERIFYING");
    }

    @Transactional
    public MaintenanceRepository.MaintenanceRecord complete(UUID actor, UUID id) {
        MaintenanceRepository.MaintenanceRecord current = get(id);
        if (!List.of("IN_PROGRESS", "VERIFYING").contains(current.status())) {
            throw conflict();
        }
        return transition(actor, id, current.status(), "COMPLETED", "MAINTENANCE_COMPLETED");
    }

    @Transactional
    public MaintenanceRepository.MaintenanceRecord cancel(UUID actor, UUID id) {
        return transition(actor, id, "SCHEDULED", "CANCELLED", "MAINTENANCE_CANCELLED");
    }

    private MaintenanceRepository.MaintenanceRecord transition(
            UUID actor,
            UUID id,
            String from,
            String to,
            String event
    ) {
        MaintenanceRepository.MaintenanceRecord maintenance;
        try {
            maintenance = repository.transition(
                    id,
                    actor,
                    from,
                    to,
                    OffsetDateTime.now(ZoneOffset.UTC)
            );
        } catch (DataIntegrityViolationException exception) {
            throw conflict();
        }
        if (maintenance == null) {
            throw conflict();
        }
        audit(actor, event, maintenance);
        return maintenance;
    }

    private void validate(MaintenanceRepository.WriteCommand command) {
        if (command == null
                || blank(command.title())
                || command.title().length() > 160
                || blank(command.message())
                || command.startsAt() == null
                || (command.endsAt() != null && !command.endsAt().isAfter(command.startsAt()))
                || (command.bannerStartsAt() != null && command.bannerStartsAt().isAfter(command.startsAt()))) {
            throw new HypofitException("validation_failed", "입력값을 확인해 주세요.", 422, "Invalid maintenance input");
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private HypofitException notFound() {
        return new HypofitException("not_found", "점검 정보를 찾지 못했어요.", 404, "Maintenance not found");
    }

    private HypofitException conflict() {
        return new HypofitException(
                "maintenance_state_conflict",
                "현재 상태에서는 처리할 수 없어요.",
                HttpStatus.CONFLICT.value(),
                "Maintenance state conflict"
        );
    }

    private void audit(UUID actor, String event, MaintenanceRepository.MaintenanceRecord maintenance) {
        audit.record(new AuditEventCommand(
                actor,
                "admin",
                event,
                "service_maintenance",
                maintenance.id(),
                null,
                Map.of("status", maintenance.status()),
                null,
                Map.of()
        ));
    }

    private String renderedNoticeBody(MaintenanceRepository.WriteCommand command) {
        return renderedNoticeBody(command, false);
    }

    private String renderedNoticeBody(MaintenanceRepository.WriteCommand command, boolean inProgress) {
        return command.message()
                + (inProgress ? "\n\n점검 시작: " : "\n\n점검 예정: ")
                + command.startsAt()
                + (command.endsAt() == null ? "" : " ~ " + command.endsAt());
    }
}
