package com.contentruck.hypofit.push.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "notification_preferences")
public class NotificationPreferenceEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "push_enabled", nullable = false)
    private boolean pushEnabled;

    @Column(name = "chat_push_enabled", nullable = false)
    private boolean chatPushEnabled;

    @Column(name = "application_push_enabled", nullable = false)
    private boolean applicationPushEnabled;

    @Column(name = "session_push_enabled", nullable = false)
    private boolean sessionPushEnabled;

    @Column(name = "support_push_enabled", nullable = false)
    private boolean supportPushEnabled;

    @Column(name = "marketing_push_enabled", nullable = false)
    private boolean marketingPushEnabled;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public boolean isPushEnabled() {
        return pushEnabled;
    }

    public void setPushEnabled(boolean pushEnabled) {
        this.pushEnabled = pushEnabled;
    }

    public boolean isChatPushEnabled() {
        return chatPushEnabled;
    }

    public void setChatPushEnabled(boolean chatPushEnabled) {
        this.chatPushEnabled = chatPushEnabled;
    }

    public boolean isApplicationPushEnabled() {
        return applicationPushEnabled;
    }

    public void setApplicationPushEnabled(boolean applicationPushEnabled) {
        this.applicationPushEnabled = applicationPushEnabled;
    }

    public boolean isSessionPushEnabled() {
        return sessionPushEnabled;
    }

    public void setSessionPushEnabled(boolean sessionPushEnabled) {
        this.sessionPushEnabled = sessionPushEnabled;
    }

    public boolean isSupportPushEnabled() {
        return supportPushEnabled;
    }

    public void setSupportPushEnabled(boolean supportPushEnabled) {
        this.supportPushEnabled = supportPushEnabled;
    }

    public boolean isMarketingPushEnabled() {
        return marketingPushEnabled;
    }

    public void setMarketingPushEnabled(boolean marketingPushEnabled) {
        this.marketingPushEnabled = marketingPushEnabled;
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
