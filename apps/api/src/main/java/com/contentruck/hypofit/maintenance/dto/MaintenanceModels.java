package com.contentruck.hypofit.maintenance.dto;

import com.contentruck.hypofit.maintenance.service.MaintenanceRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class MaintenanceModels {
    private MaintenanceModels() { }
    public record WriteRequest(@NotBlank @Size(max=160) String title, @NotBlank String message, @NotNull @JsonProperty("starts_at") OffsetDateTime startsAt, @JsonProperty("ends_at") OffsetDateTime endsAt, @JsonProperty("show_banner") boolean showBanner, @JsonProperty("banner_starts_at") OffsetDateTime bannerStartsAt, @JsonProperty("create_notice") boolean createNotice) {
        public MaintenanceRepository.WriteCommand toCommand() { return new MaintenanceRepository.WriteCommand(title == null ? null : title.trim(), message == null ? null : message.trim(), startsAt, endsAt, showBanner, bannerStartsAt); }
    }
    public record MaintenanceResponse(UUID id, String title, String message, String status, String mode, @JsonProperty("starts_at") OffsetDateTime startsAt, @JsonProperty("ends_at") OffsetDateTime endsAt, @JsonProperty("notice_id") UUID noticeId, @JsonProperty("show_banner") boolean showBanner, @JsonProperty("banner_starts_at") OffsetDateTime bannerStartsAt, @JsonProperty("started_at") OffsetDateTime startedAt, @JsonProperty("completed_at") OffsetDateTime completedAt, long version, @JsonProperty("created_at") OffsetDateTime createdAt, @JsonProperty("updated_at") OffsetDateTime updatedAt) {
        public static MaintenanceResponse from(MaintenanceRepository.MaintenanceRecord r) { return new MaintenanceResponse(r.id(),r.title(),r.message(),r.status(),r.mode(),r.startsAt(),r.endsAt(),r.noticeId(),r.showBanner(),r.bannerStartsAt(),r.startedAt(),r.completedAt(),r.version(),r.createdAt(),r.updatedAt()); }
    }
    public record PublicStatus(String status, String mode, String title, String message, @JsonProperty("starts_at") OffsetDateTime startsAt, @JsonProperty("ends_at") OffsetDateTime endsAt, @JsonProperty("notice_id") UUID noticeId, @JsonProperty("affected_features") List<String> affectedFeatures, @JsonProperty("scheduled_maintenance") ScheduledMaintenance scheduledMaintenance) {
        public static PublicStatus normal(ScheduledMaintenance scheduled) { return new PublicStatus("NORMAL","NONE",null,null,null,null,null,List.of(),scheduled); }
        public static PublicStatus active(MaintenanceRepository.MaintenanceRecord r) { return new PublicStatus(r.status(),r.mode(),r.title(),r.message(),r.startsAt(),r.endsAt(),r.noticeId(),List.of("POSTING","APPLICATION","CHAT","SESSION"),null); }
    }
    public record ScheduledMaintenance(UUID id, String title, @JsonProperty("starts_at") OffsetDateTime startsAt, @JsonProperty("ends_at") OffsetDateTime endsAt, @JsonProperty("notice_id") UUID noticeId) {
        public static ScheduledMaintenance from(MaintenanceRepository.MaintenanceRecord r) { return new ScheduledMaintenance(r.id(),r.title(),r.startsAt(),r.endsAt(),r.noticeId()); }
    }
}
