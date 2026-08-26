package com.contentruck.hypofit.interview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.contentruck.hypofit.interview.service.PostingCompensation;

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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "compensations", nullable = false, columnDefinition = "jsonb")
    private List<PostingCompensation> compensations = List.of();

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "recruit_count", nullable = false)
    private int recruitCount;

    @Column(name = "recruitment_type", nullable = false, length = 30)
    private String recruitmentType;

    @Column(name = "external_provider", length = 30)
    private String externalProvider;

    @Column(name = "external_url")
    private String externalUrl;

    @Column(name = "participation_deadline_at")
    private OffsetDateTime participationDeadlineAt;

    @Column(name = "external_data_notice")
    private String externalDataNotice;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "beta_test_platforms", columnDefinition = "text[]")
    private String[] betaTestPlatforms = new String[0];

    @Column(name = "beta_test_starts_at")
    private OffsetDateTime betaTestStartsAt;

    @Column(name = "beta_test_ends_at")
    private OffsetDateTime betaTestEndsAt;

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

    public List<PostingCompensation> getCompensations() {
        return compensations == null ? List.of() : List.copyOf(compensations);
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public int getRecruitCount() {
        return recruitCount;
    }

    public String getRecruitmentType() {
        return recruitmentType;
    }

    public String getExternalProvider() {
        return externalProvider;
    }

    public String getExternalUrl() {
        return externalUrl;
    }

    public OffsetDateTime getParticipationDeadlineAt() {
        return participationDeadlineAt;
    }

    public String getExternalDataNotice() {
        return externalDataNotice;
    }

    public List<String> getBetaTestPlatforms() {
        if (betaTestPlatforms == null || betaTestPlatforms.length == 0) {
            return List.of();
        }
        return List.copyOf(Arrays.asList(betaTestPlatforms));
    }

    public OffsetDateTime getBetaTestStartsAt() {
        return betaTestStartsAt;
    }

    public OffsetDateTime getBetaTestEndsAt() {
        return betaTestEndsAt;
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

    public void setCompensations(List<PostingCompensation> compensations) {
        this.compensations = compensations == null ? List.of() : List.copyOf(compensations);
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public void setRecruitCount(int recruitCount) {
        this.recruitCount = recruitCount;
    }

    public void setRecruitmentType(String recruitmentType) {
        this.recruitmentType = recruitmentType;
    }

    public void setExternalProvider(String externalProvider) {
        this.externalProvider = externalProvider;
    }

    public void setExternalUrl(String externalUrl) {
        this.externalUrl = externalUrl;
    }

    public void setParticipationDeadlineAt(OffsetDateTime participationDeadlineAt) {
        this.participationDeadlineAt = participationDeadlineAt;
    }

    public void setExternalDataNotice(String externalDataNotice) {
        this.externalDataNotice = externalDataNotice;
    }

    public void setBetaTestPlatforms(List<String> betaTestPlatforms) {
        this.betaTestPlatforms = betaTestPlatforms == null ? new String[0] : betaTestPlatforms.toArray(String[]::new);
    }

    public void setBetaTestStartsAt(OffsetDateTime betaTestStartsAt) {
        this.betaTestStartsAt = betaTestStartsAt;
    }

    public void setBetaTestEndsAt(OffsetDateTime betaTestEndsAt) {
        this.betaTestEndsAt = betaTestEndsAt;
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
