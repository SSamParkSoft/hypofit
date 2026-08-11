package com.contentruck.hypofit.interview.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "applications")
public class ApplicationEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "interview_post_id", nullable = false)
    private UUID interviewPostId;

    @Column(name = "respondent_id", nullable = false)
    private UUID respondentId;

    @Column(name = "moderation_status", nullable = false, length = 30)
    private String moderationStatus;

    public UUID getId() {
        return id;
    }

    public UUID getInterviewPostId() {
        return interviewPostId;
    }

    public UUID getRespondentId() {
        return respondentId;
    }

    public String getModerationStatus() {
        return moderationStatus;
    }
}
