package com.contentruck.hypofit.audit.application;

public interface AuditWriteRepository {

    void record(AuditEventCommand command);
}
