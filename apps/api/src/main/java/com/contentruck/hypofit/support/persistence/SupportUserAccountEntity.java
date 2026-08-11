package com.contentruck.hypofit.support.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class SupportUserAccountEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "deactivated_at")
    private OffsetDateTime deactivatedAt;

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }

    public OffsetDateTime getDeactivatedAt() {
        return deactivatedAt;
    }
}
