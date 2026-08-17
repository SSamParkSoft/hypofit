package com.contentruck.hypofit.socialauth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "social_auth_attempts")
public class SocialAuthAttemptEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Column(name = "platform", nullable = false, length = 20)
    private String platform;

    @Column(name = "flow", nullable = false, length = 20)
    private String flow;

    @Column(name = "return_path", length = 2048)
    private String returnPath;

    @Column(name = "secret_hash", nullable = false, length = 128)
    private String secretHash;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "auth_user_id")
    private UUID authUserId;

    @Column(name = "result_next_step", length = 50)
    private String resultNextStep;

    @Column(name = "result_email", length = 320)
    private String resultEmail;

    @Column(name = "result_email_verified")
    private Boolean resultEmailVerified;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getFlow() {
        return flow;
    }

    public void setFlow(String flow) {
        this.flow = flow;
    }

    public String getReturnPath() {
        return returnPath;
    }

    public void setReturnPath(String returnPath) {
        this.returnPath = returnPath;
    }

    public String getSecretHash() {
        return secretHash;
    }

    public void setSecretHash(String secretHash) {
        this.secretHash = secretHash;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getAuthUserId() {
        return authUserId;
    }

    public void setAuthUserId(UUID authUserId) {
        this.authUserId = authUserId;
    }

    public String getResultNextStep() {
        return resultNextStep;
    }

    public void setResultNextStep(String resultNextStep) {
        this.resultNextStep = resultNextStep;
    }

    public String getResultEmail() {
        return resultEmail;
    }

    public void setResultEmail(String resultEmail) {
        this.resultEmail = resultEmail;
    }

    public Boolean getResultEmailVerified() {
        return resultEmailVerified;
    }

    public void setResultEmailVerified(Boolean resultEmailVerified) {
        this.resultEmailVerified = resultEmailVerified;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
