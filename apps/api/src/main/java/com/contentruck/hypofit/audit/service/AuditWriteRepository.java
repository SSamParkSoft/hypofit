package com.contentruck.hypofit.audit.service;

public interface AuditWriteRepository {

    void record(AuditEventCommand command);
}
