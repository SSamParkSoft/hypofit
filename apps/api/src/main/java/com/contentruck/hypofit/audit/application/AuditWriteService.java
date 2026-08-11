package com.contentruck.hypofit.audit.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditWriteService {

    private final AuditWriteRepository repository;

    public AuditWriteService(AuditWriteRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(AuditEventCommand command) {
        repository.record(command);
    }
}
