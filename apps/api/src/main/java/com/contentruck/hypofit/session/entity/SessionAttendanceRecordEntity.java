package com.contentruck.hypofit.session.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_records")
public class SessionAttendanceRecordEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "founder_confirmed", nullable = false)
    private boolean founderConfirmed;

    @Column(name = "respondent_confirmed", nullable = false)
    private boolean respondentConfirmed;

    @Column(name = "founder_confirmed_at")
    private OffsetDateTime founderConfirmedAt;

    @Column(name = "respondent_confirmed_at")
    private OffsetDateTime respondentConfirmedAt;

    @Column(name = "completed_by")
    private UUID completedBy;

    @Column(name = "completion_source", length = 40)
    private String completionSource;

    @Column(name = "no_show_party", length = 30)
    private String noShowParty;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public boolean isFounderConfirmed() {
        return founderConfirmed;
    }

    public void setFounderConfirmed(boolean founderConfirmed) {
        this.founderConfirmed = founderConfirmed;
    }

    public boolean isRespondentConfirmed() {
        return respondentConfirmed;
    }

    public void setRespondentConfirmed(boolean respondentConfirmed) {
        this.respondentConfirmed = respondentConfirmed;
    }

    public OffsetDateTime getFounderConfirmedAt() {
        return founderConfirmedAt;
    }

    public void setFounderConfirmedAt(OffsetDateTime founderConfirmedAt) {
        this.founderConfirmedAt = founderConfirmedAt;
    }

    public OffsetDateTime getRespondentConfirmedAt() {
        return respondentConfirmedAt;
    }

    public void setRespondentConfirmedAt(OffsetDateTime respondentConfirmedAt) {
        this.respondentConfirmedAt = respondentConfirmedAt;
    }

    public UUID getCompletedBy() {
        return completedBy;
    }

    public void setCompletedBy(UUID completedBy) {
        this.completedBy = completedBy;
    }

    public String getCompletionSource() {
        return completionSource;
    }

    public void setCompletionSource(String completionSource) {
        this.completionSource = completionSource;
    }

    public String getNoShowParty() {
        return noShowParty;
    }

    public void setNoShowParty(String noShowParty) {
        this.noShowParty = noShowParty;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
