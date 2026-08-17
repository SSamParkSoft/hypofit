package com.contentruck.hypofit.push.controller;

import com.contentruck.hypofit.common.error.AuthRequiredException;
import com.contentruck.hypofit.push.dto.NotificationPreferenceResponse;
import com.contentruck.hypofit.push.dto.NotificationPreferenceUpdateRequest;
import com.contentruck.hypofit.push.dto.PushDeviceRegisterRequest;
import com.contentruck.hypofit.push.dto.PushDeviceResponse;
import com.contentruck.hypofit.push.service.PushService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "HTTPBearer")
public class PushController {

    private final PushService pushService;

    public PushController(PushService pushService) {
        this.pushService = pushService;
    }

    @PostMapping("/push-devices")
    public PushDeviceResponse registerPushDevice(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody PushDeviceRegisterRequest request
    ) {
        return PushDeviceResponse.from(pushService.registerPushDevice(currentUserId(jwt), request.toCommand()));
    }

    @DeleteMapping("/push-devices/{push_device_id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disablePushDevice(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("push_device_id") UUID pushDeviceId
    ) {
        pushService.disablePushDevice(currentUserId(jwt), pushDeviceId);
    }

    @GetMapping("/notification-preferences")
    public NotificationPreferenceResponse getNotificationPreferences(@AuthenticationPrincipal Jwt jwt) {
        return NotificationPreferenceResponse.from(pushService.getPreferences(currentUserId(jwt)));
    }

    @PatchMapping("/notification-preferences")
    public NotificationPreferenceResponse updateNotificationPreferences(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody NotificationPreferenceUpdateRequest request
    ) {
        return NotificationPreferenceResponse.from(pushService.updatePreferences(currentUserId(jwt), request.toCommand()));
    }

    private UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new AuthRequiredException("JWT subject is missing");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
