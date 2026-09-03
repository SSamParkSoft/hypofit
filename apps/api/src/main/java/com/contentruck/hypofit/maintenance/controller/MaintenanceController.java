package com.contentruck.hypofit.maintenance.controller;

import com.contentruck.hypofit.admin.service.AdminAccessService;
import com.contentruck.hypofit.maintenance.dto.MaintenanceModels;
import com.contentruck.hypofit.maintenance.service.MaintenanceRepository;
import com.contentruck.hypofit.maintenance.service.MaintenanceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MaintenanceController {
    private final MaintenanceService service;
    private final AdminAccessService admin;

    public MaintenanceController(MaintenanceService service, AdminAccessService admin) {
        this.service = service;
        this.admin = admin;
    }

    @GetMapping("/api/v1/service-status")
    public ResponseEntity<MaintenanceModels.PublicStatus> publicStatus() {
        MaintenanceRepository.MaintenanceRecord active = service.active();
        MaintenanceModels.PublicStatus body = active == null
                ? MaintenanceModels.PublicStatus.normal(optionalScheduled())
                : MaintenanceModels.PublicStatus.active(active);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }

    @GetMapping("/api/v1/admin/maintenances")
    public List<MaintenanceModels.MaintenanceResponse> list(@AuthenticationPrincipal Jwt jwt) {
        admin.requireAdmin(jwt);
        return service.list().stream().map(MaintenanceModels.MaintenanceResponse::from).toList();
    }

    @PostMapping("/api/v1/admin/maintenances")
    public MaintenanceModels.MaintenanceResponse create(
            @Valid @RequestBody MaintenanceModels.WriteRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return MaintenanceModels.MaintenanceResponse.from(
                service.create(admin.requireAdmin(jwt).id(), request.toCommand(), request.createNotice())
        );
    }

    @PostMapping("/api/v1/admin/maintenances/emergency-start")
    public MaintenanceModels.MaintenanceResponse emergencyStart(
            @Valid @RequestBody MaintenanceModels.EmergencyStartRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return MaintenanceModels.MaintenanceResponse.from(
                service.emergencyStart(
                        admin.requireAdmin(jwt).id(),
                        request.toCommand(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC)),
                        request.createNotice()
                )
        );
    }

    @GetMapping("/api/v1/admin/maintenances/{id}")
    public MaintenanceModels.MaintenanceResponse get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        admin.requireAdmin(jwt);
        return MaintenanceModels.MaintenanceResponse.from(service.get(id));
    }

    @PatchMapping("/api/v1/admin/maintenances/{id}")
    public MaintenanceModels.MaintenanceResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody MaintenanceModels.WriteRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return MaintenanceModels.MaintenanceResponse.from(
                service.update(admin.requireAdmin(jwt).id(), id, request.toCommand())
        );
    }

    @PostMapping("/api/v1/admin/maintenances/{id}/start")
    public MaintenanceModels.MaintenanceResponse start(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return MaintenanceModels.MaintenanceResponse.from(service.start(admin.requireAdmin(jwt).id(), id));
    }

    @PostMapping("/api/v1/admin/maintenances/{id}/verify")
    public MaintenanceModels.MaintenanceResponse verify(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return MaintenanceModels.MaintenanceResponse.from(service.verify(admin.requireAdmin(jwt).id(), id));
    }

    @PostMapping("/api/v1/admin/maintenances/{id}/complete")
    public MaintenanceModels.MaintenanceResponse complete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return MaintenanceModels.MaintenanceResponse.from(service.complete(admin.requireAdmin(jwt).id(), id));
    }

    @PostMapping("/api/v1/admin/maintenances/{id}/cancel")
    public MaintenanceModels.MaintenanceResponse cancel(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return MaintenanceModels.MaintenanceResponse.from(service.cancel(admin.requireAdmin(jwt).id(), id));
    }

    private MaintenanceModels.ScheduledMaintenance optionalScheduled() {
        MaintenanceRepository.MaintenanceRecord record = service.visibleScheduled();
        return record == null ? null : MaintenanceModels.ScheduledMaintenance.from(record);
    }
}
