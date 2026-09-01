package com.contentruck.hypofit.survey.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity(name = "SurveyInterviewPostEntity")
@Table(name = "interview_posts")
public class SurveyInterviewPostEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "founder_id", nullable = false)
    private UUID founderId;

    @Column(name = "recruitment_type", nullable = false, length = 30)
    private String recruitmentType;

    @Column(name = "entry_mode", nullable = false, length = 30)
    private String entryMode;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "participation_deadline_at")
    private OffsetDateTime participationDeadlineAt;

    @Column(name = "external_url")
    private String externalUrl;

    public UUID getId() {
        return id;
    }

    public UUID getFounderId() {
        return founderId;
    }

    public String getRecruitmentType() {
        return recruitmentType;
    }

    public String getEntryMode() {
        return entryMode;
    }

    public String getStatus() {
        return status;
    }

    public OffsetDateTime getParticipationDeadlineAt() {
        return participationDeadlineAt;
    }

    public String getExternalUrl() {
        return externalUrl;
    }
}
