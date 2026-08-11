package com.contentruck.hypofit.session.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reward_confirmations")
public class SessionRewardConfirmationEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "founder_id", nullable = false)
    private UUID founderId;

    @Column(name = "respondent_id", nullable = false)
    private UUID respondentId;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Column(name = "status", nullable = false, length = 40)
    private String status;

    @Column(name = "founder_marked_paid_at")
    private OffsetDateTime founderMarkedPaidAt;

    @Column(name = "respondent_confirmed_at")
    private OffsetDateTime respondentConfirmedAt;

    @Column(name = "disputed_at")
    private OffsetDateTime disputedAt;

    @Column(name = "dispute_reason")
    private String disputeReason;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

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

    public UUID getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(UUID applicationId) {
        this.applicationId = applicationId;
    }

    public UUID getFounderId() {
        return founderId;
    }

    public void setFounderId(UUID founderId) {
        this.founderId = founderId;
    }

    public UUID getRespondentId() {
        return respondentId;
    }

    public void setRespondentId(UUID respondentId) {
        this.respondentId = respondentId;
    }

    public int getAmount() {
        return amount;
    }

    public void setAmount(int amount) {
        this.amount = amount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getFounderMarkedPaidAt() {
        return founderMarkedPaidAt;
    }

    public void setFounderMarkedPaidAt(OffsetDateTime founderMarkedPaidAt) {
        this.founderMarkedPaidAt = founderMarkedPaidAt;
    }

    public OffsetDateTime getRespondentConfirmedAt() {
        return respondentConfirmedAt;
    }

    public void setRespondentConfirmedAt(OffsetDateTime respondentConfirmedAt) {
        this.respondentConfirmedAt = respondentConfirmedAt;
    }

    public OffsetDateTime getDisputedAt() {
        return disputedAt;
    }

    public void setDisputedAt(OffsetDateTime disputedAt) {
        this.disputedAt = disputedAt;
    }

    public String getDisputeReason() {
        return disputeReason;
    }

    public void setDisputeReason(String disputeReason) {
        this.disputeReason = disputeReason;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
