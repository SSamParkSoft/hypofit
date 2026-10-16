package com.contentruck.hypofit.maintenance.service;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.notice.service.NoticeRepository;
import com.contentruck.hypofit.notice.service.NoticeService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Objects;
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
    public List<MaintenanceRepository.MaintenanceEvent> events(UUID id) {
        get(id);
        return repository.listEvents(id);
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
                    new NoticeRepository.NoticeWriteCommand("MAINTENANCE", command.title(), renderedNoticeBody(maintenance))
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
            MaintenanceRepository.WriteCommand command,
            Long expectedVersion
    ) {
        validate(command);
        MaintenanceRepository.MaintenanceRecord before = repository.findForUpdate(id).orElseThrow(this::notFound);
        if (expectedVersion != null && expectedVersion.longValue() != before.version()) {
            throw conflict();
        }
        if (!"SCHEDULED".equals(before.status())
                && (!before.startsAt().isEqual(command.startsAt())
                || before.showBanner() != command.showBanner()
                || !Objects.equals(before.bannerStartsAt(), command.bannerStartsAt()))) {
            throw conflict();
        }
        MaintenanceRepository.MaintenanceRecord maintenance = repository.update(id, actor, command, before.version());
        if (maintenance == null) {
            throw conflict();
        }
        syncNotice(actor, maintenance);
        audit(actor, "MAINTENANCE_UPDATED", before, maintenance);
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
                                renderedNoticeBody(maintenance)
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
        MaintenanceRepository.MaintenanceRecord before = repository.findForUpdate(id).orElseThrow(this::notFound);
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
        syncNotice(actor, maintenance);
        audit(actor, event, before, maintenance);
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
                "점검 상태가 변경됐거나 다른 운영자가 수정했어요. 최신 상태를 다시 확인해 주세요.",
                HttpStatus.CONFLICT.value(),
                "Maintenance state conflict"
        );
    }

    private void audit(UUID actor, String event, MaintenanceRepository.MaintenanceRecord maintenance) {
        audit(actor, event, null, maintenance);
    }

    private void audit(UUID actor, String event, MaintenanceRepository.MaintenanceRecord before,
                       MaintenanceRepository.MaintenanceRecord maintenance) {
        audit.record(new AuditEventCommand(
                actor,
                "admin",
                event,
                "service_maintenance",
                maintenance.id(),
                before == null ? null : snapshot(before),
                snapshot(maintenance),
                null,
                Map.of()
        ));
    }

    private Map<String, Object> snapshot(MaintenanceRepository.MaintenanceRecord record) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", record.status());
        result.put("title", record.title());
        result.put("message", record.message());
        result.put("starts_at", record.startsAt().toString());
        result.put("ends_at", record.endsAt() == null ? null : record.endsAt().toString());
        result.put("show_banner", record.showBanner());
        result.put("banner_starts_at", record.bannerStartsAt() == null ? null : record.bannerStartsAt().toString());
        return result;
    }

    private void syncNotice(UUID actor, MaintenanceRepository.MaintenanceRecord maintenance) {
        if (maintenance.noticeId() != null) {
            noticeService.update(actor, maintenance.noticeId(), new NoticeRepository.NoticeWriteCommand(
                    "MAINTENANCE", maintenance.title(), renderedNoticeBody(maintenance)));
        }
    }

    private String renderedNoticeBody(MaintenanceRepository.MaintenanceRecord record) {
        String status = switch (record.status()) {
            case "IN_PROGRESS" -> "점검 중";
            case "VERIFYING" -> "정상화 확인 중";
            case "COMPLETED" -> "점검 완료";
            case "CANCELLED" -> "점검 취소";
            default -> "점검 예정";
        };
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm").withZone(ZoneId.of("Asia/Seoul"));
        String end = record.endsAt() == null ? "종료 시간 미정" : formatter.format(record.endsAt());
        String completed = record.completedAt() == null ? "" : "\n완료 시각: " + formatter.format(record.completedAt());
        return record.message() + "\n\n상태: " + status + "\n점검 일시 (한국 시간): "
                + formatter.format(record.startsAt()) + " ~ " + end + completed;
    }
}
