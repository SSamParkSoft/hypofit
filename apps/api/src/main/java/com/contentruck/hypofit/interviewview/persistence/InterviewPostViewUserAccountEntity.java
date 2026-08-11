package com.contentruck.hypofit.interviewview.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class InterviewPostViewUserAccountEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "deactivated_at")
    private OffsetDateTime deactivatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    public UUID getId() {
        return id;
    }

    public OffsetDateTime getDeactivatedAt() {
        return deactivatedAt;
    }

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }
}
