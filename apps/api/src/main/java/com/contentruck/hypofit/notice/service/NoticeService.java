package com.contentruck.hypofit.notice.service;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NoticeService {
    private final NoticeRepository repository;
    private final AuditWriteService audit;

    public NoticeService(NoticeRepository repository, AuditWriteService audit) {
        this.repository = repository;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<NoticeRepository.NoticeRecord> listPublished() {
        return repository.listPublished();
    }

    @Transactional(readOnly = true)
    public NoticeRepository.NoticeRecord getPublished(UUID id) {
        return repository.findPublished(id).orElseThrow(this::notFound);
    }

    @Transactional(readOnly = true)
    public List<NoticeRepository.NoticeRecord> listAll() {
        return repository.listAll();
    }

    @Transactional(readOnly = true)
    public NoticeRepository.NoticeRecord get(UUID id) {
        return repository.find(id).orElseThrow(this::notFound);
    }

    @Transactional
    public NoticeRepository.NoticeRecord create(UUID actorId, NoticeRepository.NoticeWriteCommand command) {
        validate(command);
        NoticeRepository.NoticeRecord notice = repository.insert(actorId, command);
        audit(actorId, "NOTICE_CREATED", notice.id(), null, notice);
        return notice;
    }

    @Transactional
    public NoticeRepository.NoticeRecord updateEditorial(UUID actorId, UUID id, NoticeRepository.NoticeWriteCommand command) {
        if (getForUpdate(id).managedByMaintenance()) {
            throw new HypofitException("notice_managed_by_maintenance", "연결된 점검의 안내를 서비스 운영에서 수정해 주세요.", 409, "Notice managed by maintenance");
        }
        return update(actorId, id, command);
    }

    @Transactional
    public NoticeRepository.NoticeRecord update(UUID actorId, UUID id, NoticeRepository.NoticeWriteCommand command) {
        validate(command);
        NoticeRepository.NoticeRecord before = getForUpdate(id);
        NoticeRepository.NoticeRecord notice = repository.update(id, actorId, command);
        audit(actorId, "NOTICE_UPDATED", id, before, notice);
        return notice;
    }

    @Transactional
    public NoticeRepository.NoticeRecord publish(UUID actorId, UUID id) {
        getForUpdate(id);
        NoticeRepository.NoticeRecord notice = repository.changeStatus(id, actorId, "DRAFT", "PUBLISHED", OffsetDateTime.now(ZoneOffset.UTC));
        if (notice == null) {
            throw conflict();
        }
        audit(actorId, "NOTICE_PUBLISHED", id, null, notice);
        return notice;
    }

    @Transactional
    public NoticeRepository.NoticeRecord archive(UUID actorId, UUID id) {
        NoticeRepository.NoticeRecord current = getForUpdate(id);
        if (current.managedByMaintenance()) {
            throw new HypofitException("notice_managed_by_maintenance", "연결된 점검은 서비스 운영에서 취소하거나 종료해 주세요.", 409, "Notice managed by maintenance");
        }
        if (!"DRAFT".equals(current.status()) && !"PUBLISHED".equals(current.status())) {
            throw conflict();
        }
        NoticeRepository.NoticeRecord notice = repository.changeStatus(id, actorId, current.status(), "ARCHIVED", current.publishedAt());
        if (notice == null) {
            throw conflict();
        }
        audit(actorId, "NOTICE_ARCHIVED", id, current, notice);
        return notice;
    }

    @Transactional
    public void delete(UUID actorId, UUID id) {
        NoticeRepository.NoticeRecord current = getForUpdate(id);
        if (current.managedByMaintenance()) {
            throw new HypofitException("notice_managed_by_maintenance", "점검에 연결된 공지는 삭제할 수 없어요.", 409, "Notice managed by maintenance");
        }
        if (!repository.delete(id)) {
            throw conflict();
        }
        audit(actorId, "NOTICE_DELETED", id, current, null);
    }

    private NoticeRepository.NoticeRecord getForUpdate(UUID id) {
        return repository.findForUpdate(id).orElseThrow(this::notFound);
    }

    private void validate(NoticeRepository.NoticeWriteCommand command) {
        if (command == null
                || !List.of("GENERAL", "MAINTENANCE", "IMPORTANT").contains(command.type())
                || blank(command.title())
                || command.title().length() > 160
                || blank(command.body())) {
            throw new HypofitException("validation_failed", "입력값을 확인해 주세요.", 422, "Invalid notice input");
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private HypofitException notFound() {
        return new HypofitException("not_found", "공지사항을 찾지 못했어요.", 404, "Notice not found");
    }

    private HypofitException conflict() {
        return new HypofitException("notice_state_conflict", "현재 상태에서는 처리할 수 없어요.", 409, "Notice state conflict");
    }
    private void audit(UUID actorId, String event, UUID id, NoticeRepository.NoticeRecord before, NoticeRepository.NoticeRecord after) {
        audit.record(new AuditEventCommand(actorId, "admin", event, "notice", id,
                before == null ? null : snapshot(before), after == null ? null : snapshot(after), null, Map.of()));
    }

    private Map<String, Object> snapshot(NoticeRepository.NoticeRecord notice) {
        return Map.of("status", notice.status(), "title", notice.title(), "body", notice.body(), "type", notice.type());
    }
}
