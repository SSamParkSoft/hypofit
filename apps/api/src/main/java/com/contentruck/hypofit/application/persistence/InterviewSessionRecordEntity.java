package com.contentruck.hypofit.application.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "interview_sessions")
public class InterviewSessionRecordEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "moderation_status", nullable = false, length = 30)
    private String moderationStatus;

    protected InterviewSessionRecordEntity() {
    }

    public UUID getId() {
        return id;
    }

    public UUID getApplicationId() {
        return applicationId;
    }

    public String getStatus() {
        return status;
    }

    public String getModerationStatus() {
        return moderationStatus;
    }
}
