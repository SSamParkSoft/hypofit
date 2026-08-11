package com.contentruck.hypofit.chat.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_rooms")
public class ChatRoomEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "interview_post_id", nullable = false)
    private UUID interviewPostId;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "founder_id", nullable = false)
    private UUID founderId;

    @Column(name = "respondent_id", nullable = false)
    private UUID respondentId;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "last_message_at")
    private OffsetDateTime lastMessageAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public UUID getInterviewPostId() {
        return interviewPostId;
    }

    public UUID getApplicationId() {
        return applicationId;
    }

    public UUID getFounderId() {
        return founderId;
    }

    public UUID getRespondentId() {
        return respondentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(OffsetDateTime lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
