package com.contentruck.hypofit.interview.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "interview_posts")
public class InterviewPostEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "founder_id", nullable = false)
    private UUID founderId;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "service_summary", nullable = false)
    private String serviceSummary;

    @Column(name = "target_description", nullable = false)
    private String targetDescription;

    @Column(name = "reward_amount", nullable = false)
    private int rewardAmount;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "recruit_count", nullable = false)
    private int recruitCount;

    @Column(name = "interview_mode", nullable = false, length = 20)
    private String interviewMode;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "location_text", length = 200)
    private String locationText;

    @Column(name = "location_address", length = 300)
    private String locationAddress;

    @Column(name = "location_place_name", length = 200)
    private String locationPlaceName;

    @Column(name = "location_latitude", precision = 10, scale = 7)
    private BigDecimal locationLatitude;

    @Column(name = "location_longitude", precision = 10, scale = 7)
    private BigDecimal locationLongitude;

    @Column(name = "location_precision", length = 30)
    private String locationPrecision;

    @Column(name = "location_source", length = 30)
    private String locationSource;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schedule_options", nullable = false, columnDefinition = "jsonb")
    private List<String> scheduleOptions = List.of();

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public UUID getFounderId() {
        return founderId;
    }

    public String getTitle() {
        return title;
    }

    public String getServiceSummary() {
        return serviceSummary;
    }

    public String getTargetDescription() {
        return targetDescription;
    }

    public int getRewardAmount() {
        return rewardAmount;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public int getRecruitCount() {
        return recruitCount;
    }

    public String getInterviewMode() {
        return interviewMode;
    }

    public String getLocation() {
        return location;
    }

    public String getLocationText() {
        return locationText;
    }

    public String getLocationAddress() {
        return locationAddress;
    }

    public String getLocationPlaceName() {
        return locationPlaceName;
    }

    public BigDecimal getLocationLatitude() {
        return locationLatitude;
    }

    public BigDecimal getLocationLongitude() {
        return locationLongitude;
    }

    public String getLocationPrecision() {
        return locationPrecision;
    }

    public String getLocationSource() {
        return locationSource;
    }

    public String getStatus() {
        return status;
    }

    public List<String> getScheduleOptions() {
        return scheduleOptions;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setFounderId(UUID founderId) {
        this.founderId = founderId;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setServiceSummary(String serviceSummary) {
        this.serviceSummary = serviceSummary;
    }

    public void setTargetDescription(String targetDescription) {
        this.targetDescription = targetDescription;
    }

    public void setRewardAmount(int rewardAmount) {
        this.rewardAmount = rewardAmount;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public void setRecruitCount(int recruitCount) {
        this.recruitCount = recruitCount;
    }

    public void setInterviewMode(String interviewMode) {
        this.interviewMode = interviewMode;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setLocationText(String locationText) {
        this.locationText = locationText;
    }

    public void setLocationAddress(String locationAddress) {
        this.locationAddress = locationAddress;
    }

    public void setLocationPlaceName(String locationPlaceName) {
        this.locationPlaceName = locationPlaceName;
    }

    public void setLocationLatitude(BigDecimal locationLatitude) {
        this.locationLatitude = locationLatitude;
    }

    public void setLocationLongitude(BigDecimal locationLongitude) {
        this.locationLongitude = locationLongitude;
    }

    public void setLocationPrecision(String locationPrecision) {
        this.locationPrecision = locationPrecision;
    }

    public void setLocationSource(String locationSource) {
        this.locationSource = locationSource;
    }

    public void setScheduleOptions(List<String> scheduleOptions) {
        this.scheduleOptions = scheduleOptions == null ? List.of() : List.copyOf(scheduleOptions);
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
