package com.contentruck.hypofit.accountdeletion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "account_deletion_requests")
public class AccountDeletionRequestEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "email", nullable = false, length = 320)
    private String email;

    @Column(name = "email_hash", length = 128)
    private String emailHash;

    @Column(name = "email_redacted_at")
    private OffsetDateTime emailRedactedAt;

    @Column(name = "requester_name", length = 100)
    private String requesterName;

    @Column(name = "reason")
    private String reason;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "source", nullable = false, length = 30)
    private String source;

    @Column(name = "verification_token_hash", length = 200)
    private String verificationTokenHash;

    @Column(name = "verification_code_hash", length = 128)
    private String verificationCodeHash;

    @Column(name = "verification_expires_at")
    private OffsetDateTime verificationExpiresAt;

    @Column(name = "verification_attempt_count", nullable = false)
    private int verificationAttemptCount;

    @Column(name = "verification_resend_available_at")
    private OffsetDateTime verificationResendAvailableAt;

    @Column(name = "verification_locked_at")
    private OffsetDateTime verificationLockedAt;

    @Column(name = "verification_send_count", nullable = false)
    private int verificationSendCount;

    @Column(name = "verification_window_started_at")
    private OffsetDateTime verificationWindowStartedAt;

    @Column(name = "deletion_authorization_hash", length = 128)
    private String deletionAuthorizationHash;

    @Column(name = "deletion_authorization_expires_at")
    private OffsetDateTime deletionAuthorizationExpiresAt;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Column(name = "processed_by")
    private UUID processedBy;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

    @Column(name = "result")
    private String result;

    @Column(name = "retention_note")
    private String retentionNote;

    @Column(name = "retention_until")
    private OffsetDateTime retentionUntil;

    @Column(name = "auth_user_delete_status", length = 40)
    private String authUserDeleteStatus;

    @Column(name = "auth_user_deleted_at")
    private OffsetDateTime authUserDeletedAt;

    @Column(name = "auth_user_delete_error_code", length = 120)
    private String authUserDeleteErrorCode;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getEmailHash() {
        return emailHash;
    }

    public void setEmailHash(String emailHash) {
        this.emailHash = emailHash;
    }

    public OffsetDateTime getEmailRedactedAt() {
        return emailRedactedAt;
    }

    public void setEmailRedactedAt(OffsetDateTime emailRedactedAt) {
        this.emailRedactedAt = emailRedactedAt;
    }

    public String getRequesterName() {
        return requesterName;
    }

    public void setRequesterName(String requesterName) {
        this.requesterName = requesterName;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getVerificationTokenHash() {
        return verificationTokenHash;
    }

    public void setVerificationTokenHash(String verificationTokenHash) {
        this.verificationTokenHash = verificationTokenHash;
    }

    public String getVerificationCodeHash() {
        return verificationCodeHash;
    }

    public void setVerificationCodeHash(String verificationCodeHash) {
        this.verificationCodeHash = verificationCodeHash;
    }

    public OffsetDateTime getVerificationExpiresAt() {
        return verificationExpiresAt;
    }

    public void setVerificationExpiresAt(OffsetDateTime verificationExpiresAt) {
        this.verificationExpiresAt = verificationExpiresAt;
    }

    public int getVerificationAttemptCount() {
        return verificationAttemptCount;
    }

    public void setVerificationAttemptCount(int verificationAttemptCount) {
        this.verificationAttemptCount = verificationAttemptCount;
    }

    public OffsetDateTime getVerificationResendAvailableAt() {
        return verificationResendAvailableAt;
    }

    public void setVerificationResendAvailableAt(OffsetDateTime verificationResendAvailableAt) {
        this.verificationResendAvailableAt = verificationResendAvailableAt;
    }

    public OffsetDateTime getVerificationLockedAt() {
        return verificationLockedAt;
    }

    public void setVerificationLockedAt(OffsetDateTime verificationLockedAt) {
        this.verificationLockedAt = verificationLockedAt;
    }

    public int getVerificationSendCount() {
        return verificationSendCount;
    }

    public void setVerificationSendCount(int verificationSendCount) {
        this.verificationSendCount = verificationSendCount;
    }

    public OffsetDateTime getVerificationWindowStartedAt() {
        return verificationWindowStartedAt;
    }

    public void setVerificationWindowStartedAt(OffsetDateTime verificationWindowStartedAt) {
        this.verificationWindowStartedAt = verificationWindowStartedAt;
    }

    public String getDeletionAuthorizationHash() {
        return deletionAuthorizationHash;
    }

    public void setDeletionAuthorizationHash(String deletionAuthorizationHash) {
        this.deletionAuthorizationHash = deletionAuthorizationHash;
    }

    public OffsetDateTime getDeletionAuthorizationExpiresAt() {
        return deletionAuthorizationExpiresAt;
    }

    public void setDeletionAuthorizationExpiresAt(OffsetDateTime deletionAuthorizationExpiresAt) {
        this.deletionAuthorizationExpiresAt = deletionAuthorizationExpiresAt;
    }

    public OffsetDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(OffsetDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public UUID getProcessedBy() {
        return processedBy;
    }

    public void setProcessedBy(UUID processedBy) {
        this.processedBy = processedBy;
    }

    public OffsetDateTime getProcessedAt() {
        return processedAt;
    }

    public void setProcessedAt(OffsetDateTime processedAt) {
        this.processedAt = processedAt;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public String getRetentionNote() {
        return retentionNote;
    }

    public void setRetentionNote(String retentionNote) {
        this.retentionNote = retentionNote;
    }

    public OffsetDateTime getRetentionUntil() {
        return retentionUntil;
    }

    public void setRetentionUntil(OffsetDateTime retentionUntil) {
        this.retentionUntil = retentionUntil;
    }

    public String getAuthUserDeleteStatus() {
        return authUserDeleteStatus;
    }

    public void setAuthUserDeleteStatus(String authUserDeleteStatus) {
        this.authUserDeleteStatus = authUserDeleteStatus;
    }

    public OffsetDateTime getAuthUserDeletedAt() {
        return authUserDeletedAt;
    }

    public void setAuthUserDeletedAt(OffsetDateTime authUserDeletedAt) {
        this.authUserDeletedAt = authUserDeletedAt;
    }

    public String getAuthUserDeleteErrorCode() {
        return authUserDeleteErrorCode;
    }

    public void setAuthUserDeleteErrorCode(String authUserDeleteErrorCode) {
        this.authUserDeleteErrorCode = authUserDeleteErrorCode;
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
