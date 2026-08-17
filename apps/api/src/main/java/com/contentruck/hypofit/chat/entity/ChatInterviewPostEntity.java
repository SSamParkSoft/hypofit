package com.contentruck.hypofit.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "interview_posts")
public class ChatInterviewPostEntity {

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
    @Column(name = "schedule_options", nullable = false)
    private List<String> scheduleOptions = List.of();

    @Column(name = "status", nullable = false, length = 30)
    private String status;

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

    public List<String> getScheduleOptions() {
        return scheduleOptions;
    }

    public String getStatus() {
        return status;
    }
}
