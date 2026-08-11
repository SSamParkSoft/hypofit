package com.contentruck.hypofit.interviewview.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "interview_post_views")
public class InterviewPostViewEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "interview_post_id", nullable = false)
    private UUID interviewPostId;

    @Column(name = "first_viewed_at", nullable = false)
    private OffsetDateTime firstViewedAt;

    @Column(name = "last_viewed_at", nullable = false)
    private OffsetDateTime lastViewedAt;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "source", nullable = false, length = 30)
    private String source;

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getInterviewPostId() {
        return interviewPostId;
    }

    public OffsetDateTime getFirstViewedAt() {
        return firstViewedAt;
    }

    public OffsetDateTime getLastViewedAt() {
        return lastViewedAt;
    }

    public int getViewCount() {
        return viewCount;
    }

    public String getSource() {
        return source;
    }
}
