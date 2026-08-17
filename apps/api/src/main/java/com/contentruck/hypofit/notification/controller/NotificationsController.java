package com.contentruck.hypofit.notification.controller;

import com.contentruck.hypofit.notification.dto.NotificationResponse;
import com.contentruck.hypofit.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/notifications")
@SecurityRequirement(name = "HTTPBearer")
public class NotificationsController {

    private final NotificationService notificationService;

    public NotificationsController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> listNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "unread_only", defaultValue = "false")
            boolean unreadOnly,
            @RequestParam(name = "limit", defaultValue = "50")
            @Min(1) @Max(100)
            int limit
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return notificationService.listNotifications(currentUserId, unreadOnly, limit)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @PostMapping("/{notification_id}/read")
    public NotificationResponse markNotificationRead(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("notification_id") UUID notificationId
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return NotificationResponse.from(notificationService.markNotificationRead(currentUserId, notificationId));
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllNotificationsRead(@AuthenticationPrincipal Jwt jwt) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        notificationService.markAllNotificationsRead(currentUserId);
    }
}
