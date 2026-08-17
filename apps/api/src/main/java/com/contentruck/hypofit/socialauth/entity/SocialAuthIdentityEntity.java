package com.contentruck.hypofit.socialauth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "social_auth_identities")
public class SocialAuthIdentityEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_subject_hash", nullable = false, length = 128)
    private String providerSubjectHash;

    @Column(name = "supabase_identity_id", nullable = false, length = 120)
    private String supabaseIdentityId;

    @Column(name = "provider_email", length = 320)
    private String providerEmail;

    @Column(name = "provider_email_verified")
    private Boolean providerEmailVerified;

    @Column(name = "email_forwarding_enabled")
    private Boolean emailForwardingEnabled;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "linked_at", nullable = false)
    private OffsetDateTime linkedAt;

    @Column(name = "last_used_at")
    private OffsetDateTime lastUsedAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderSubjectHash() {
        return providerSubjectHash;
    }

    public void setProviderSubjectHash(String providerSubjectHash) {
        this.providerSubjectHash = providerSubjectHash;
    }

    public String getSupabaseIdentityId() {
        return supabaseIdentityId;
    }

    public void setSupabaseIdentityId(String supabaseIdentityId) {
        this.supabaseIdentityId = supabaseIdentityId;
    }

    public String getProviderEmail() {
        return providerEmail;
    }

    public void setProviderEmail(String providerEmail) {
        this.providerEmail = providerEmail;
    }

    public Boolean getProviderEmailVerified() {
        return providerEmailVerified;
    }

    public void setProviderEmailVerified(Boolean providerEmailVerified) {
        this.providerEmailVerified = providerEmailVerified;
    }

    public Boolean getEmailForwardingEnabled() {
        return emailForwardingEnabled;
    }

    public void setEmailForwardingEnabled(Boolean emailForwardingEnabled) {
        this.emailForwardingEnabled = emailForwardingEnabled;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getLinkedAt() {
        return linkedAt;
    }

    public void setLinkedAt(OffsetDateTime linkedAt) {
        this.linkedAt = linkedAt;
    }

    public OffsetDateTime getLastUsedAt() {
        return lastUsedAt;
    }

    public void setLastUsedAt(OffsetDateTime lastUsedAt) {
        this.lastUsedAt = lastUsedAt;
    }

    public OffsetDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(OffsetDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }
}
