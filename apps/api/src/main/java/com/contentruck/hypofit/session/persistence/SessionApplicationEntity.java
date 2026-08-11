package com.contentruck.hypofit.session.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "applications")
public class SessionApplicationEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "interview_post_id", nullable = false)
    private UUID interviewPostId;

    @Column(name = "respondent_id", nullable = false)
    private UUID respondentId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answers", nullable = false, columnDefinition = "jsonb")
    private Map<String, String> answers;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "available_times", nullable = false, columnDefinition = "jsonb")
    private List<String> availableTimes;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "moderation_status", nullable = false, length = 30)
    private String moderationStatus;

    @Column(name = "rejection_reason")
    private String rejectionReason;

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

    public void setStatus(String status) {
        this.status = status;
    }

    public String getModerationStatus() {
        return moderationStatus;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }
}
