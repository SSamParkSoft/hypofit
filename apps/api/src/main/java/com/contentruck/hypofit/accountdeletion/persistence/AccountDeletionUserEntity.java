package com.contentruck.hypofit.accountdeletion.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class AccountDeletionUserEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false, length = 320)
    private String email;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "bio", length = 120)
    private String bio;

    @Column(name = "phone", length = 40)
    private String phone;

    @Column(name = "role", nullable = false, length = 30)
    private String role;

    @Column(name = "profile_image_path", length = 500)
    private String profileImagePath;

    @Column(name = "profile_image_url", length = 1000)
    private String profileImageUrl;

    @Column(name = "deactivated_at")
    private OffsetDateTime deactivatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "anonymized_at")
    private OffsetDateTime anonymizedAt;

    @Column(name = "deletion_requested_at")
    private OffsetDateTime deletionRequestedAt;

    @Column(name = "deletion_completed_at")
    private OffsetDateTime deletionCompletedAt;

    @Column(name = "deletion_reason", length = 500)
    private String deletionReason;

    @Column(name = "deleted_email_hash", length = 128)
    private String deletedEmailHash;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getProfileImagePath() {
        return profileImagePath;
    }

    public void setProfileImagePath(String profileImagePath) {
        this.profileImagePath = profileImagePath;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public OffsetDateTime getDeactivatedAt() {
        return deactivatedAt;
    }

    public void setDeactivatedAt(OffsetDateTime deactivatedAt) {
        this.deactivatedAt = deactivatedAt;
    }

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(OffsetDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public OffsetDateTime getAnonymizedAt() {
        return anonymizedAt;
    }

    public void setAnonymizedAt(OffsetDateTime anonymizedAt) {
        this.anonymizedAt = anonymizedAt;
    }

    public OffsetDateTime getDeletionRequestedAt() {
        return deletionRequestedAt;
    }

    public void setDeletionRequestedAt(OffsetDateTime deletionRequestedAt) {
        this.deletionRequestedAt = deletionRequestedAt;
    }

    public OffsetDateTime getDeletionCompletedAt() {
        return deletionCompletedAt;
    }

    public void setDeletionCompletedAt(OffsetDateTime deletionCompletedAt) {
        this.deletionCompletedAt = deletionCompletedAt;
    }

    public String getDeletionReason() {
        return deletionReason;
    }

    public void setDeletionReason(String deletionReason) {
        this.deletionReason = deletionReason;
    }

    public String getDeletedEmailHash() {
        return deletedEmailHash;
    }

    public void setDeletedEmailHash(String deletedEmailHash) {
        this.deletedEmailHash = deletedEmailHash;
    }
}
