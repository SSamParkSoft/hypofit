package com.contentruck.hypofit.session.entity;

import com.contentruck.hypofit.interview.service.PostingCompensation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "interview_posts")
public class SessionInterviewPostEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "founder_id", nullable = false)
    private UUID founderId;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "reward_amount", nullable = false)
    private int rewardAmount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "compensations", nullable = false, columnDefinition = "jsonb")
    private List<PostingCompensation> compensations = List.of();

    @Column(name = "recruitment_type", nullable = false, length = 30)
    private String recruitmentType;

    public UUID getId() {
        return id;
    }

    public UUID getFounderId() {
        return founderId;
    }

    public String getTitle() {
        return title;
    }

    public int getRewardAmount() {
        return rewardAmount;
    }

    public List<PostingCompensation> getCompensations() {
        return compensations == null ? List.of() : List.copyOf(compensations);
    }

    public String getRecruitmentType() {
        return recruitmentType;
    }
}
