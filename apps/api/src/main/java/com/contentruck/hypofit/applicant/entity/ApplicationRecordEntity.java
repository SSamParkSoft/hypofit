package com.contentruck.hypofit.applicant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "applications")
public class ApplicationRecordEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "interview_post_id", nullable = false)
    private UUID interviewPostId;

    @Column(name = "respondent_id", nullable = false)
    private UUID respondentId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answers", nullable = false)
    private Map<String, String> answers;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "available_times", nullable = false)
    private List<String> availableTimes;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "moderation_status", nullable = false, length = 30)
    private String moderationStatus;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected ApplicationRecordEntity() {
    }

    public ApplicationRecordEntity(
            UUID id,
            UUID interviewPostId,
            UUID respondentId,
            Map<String, String> answers,
            List<String> availableTimes,
            String status,
            String moderationStatus,
            String rejectionReason
    ) {
        this.id = id;
        this.interviewPostId = interviewPostId;
        this.respondentId = respondentId;
        this.answers = answers;
        this.availableTimes = availableTimes;
        this.status = status;
        this.moderationStatus = moderationStatus;
        this.rejectionReason = rejectionReason;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() {
        return id;
    }

    public UUID getInterviewPostId() {
        return interviewPostId;
    }

    public UUID getRespondentId() {
        return respondentId;
    }

    public Map<String, String> getAnswers() {
        return answers;
    }

    public List<String> getAvailableTimes() {
        return availableTimes;
    }

    public String getStatus() {
        return status;
    }

    public String getModerationStatus() {
        return moderationStatus;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
