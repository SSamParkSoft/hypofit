package com.contentruck.hypofit.interview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "interview_reviews")
public class InterviewReviewEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "reviewee_id", nullable = false)
    private UUID revieweeId;

    @Column(name = "reviewer_role", nullable = false, length = 30)
    private String reviewerRole;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "visibility", nullable = false, length = 30)
    private String visibility;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public UUID getRevieweeId() {
        return revieweeId;
    }

    public String getReviewerRole() {
        return reviewerRole;
    }

    public int getRating() {
        return rating;
    }

    public String getVisibility() {
        return visibility;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
