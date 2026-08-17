package com.contentruck.hypofit.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class ChatUserAccountEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "role", nullable = false, length = 30)
    private String role;

    @Column(name = "deactivated_at")
    private OffsetDateTime deactivatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    public UUID getId() {
        return id;
    }

    public String getRole() {
        return role;
    }

    public OffsetDateTime getDeactivatedAt() {
        return deactivatedAt;
    }

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }
}
