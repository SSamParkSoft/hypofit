package com.contentruck.hypofit.survey.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity(name = "SurveyUserAccountEntity")
@Table(name = "app_users")
public class SurveyUserAccountEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "profile_image_url", length = 1000)
    private String profileImageUrl;

    @Column(name = "organization_name", length = 100)
    private String organizationName;

    @Column(name = "deactivated_at")
    private OffsetDateTime deactivatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public OffsetDateTime getDeactivatedAt() {
        return deactivatedAt;
    }

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }
}
