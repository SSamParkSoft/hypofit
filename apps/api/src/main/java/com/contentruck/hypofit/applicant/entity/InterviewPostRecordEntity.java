package com.contentruck.hypofit.applicant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "interview_posts")
public class InterviewPostRecordEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "founder_id", nullable = false)
    private UUID founderId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "recruitment_type", nullable = false, length = 30)
    private String recruitmentType;

    @Column(name = "entry_mode", nullable = false, length = 30)
    private String entryMode;

    protected InterviewPostRecordEntity() {
    }

    public UUID getId() {
        return id;
    }

    public UUID getFounderId() {
        return founderId;
    }

    public String getTitle() {
        return title;
    }

    public String getRecruitmentType() {
        return recruitmentType;
    }

    public String getEntryMode() {
        return entryMode;
    }
}
