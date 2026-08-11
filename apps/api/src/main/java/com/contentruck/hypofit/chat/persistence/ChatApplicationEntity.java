package com.contentruck.hypofit.chat.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "applications")
public class ChatApplicationEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "interview_post_id", nullable = false)
    private UUID interviewPostId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answers", nullable = false)
    private Map<String, String> answers = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "available_times", nullable = false)
    private List<String> availableTimes = List.of();

    @Column(name = "respondent_id", nullable = false)
    private UUID respondentId;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "moderation_status", nullable = false, length = 30)
    private String moderationStatus;

    public UUID getId() {
        return id;
    }

    public UUID getInterviewPostId() {
        return interviewPostId;
    }

    public Map<String, String> getAnswers() {
        return answers;
    }

    public List<String> getAvailableTimes() {
        return availableTimes;
    }

    public UUID getRespondentId() {
        return respondentId;
    }

    public String getStatus() {
        return status;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public String getModerationStatus() {
        return moderationStatus;
    }
}
