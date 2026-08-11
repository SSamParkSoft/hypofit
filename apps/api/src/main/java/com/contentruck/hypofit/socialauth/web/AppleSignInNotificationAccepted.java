package com.contentruck.hypofit.socialauth.web;

import io.swagger.v3.oas.annotations.media.Schema;

public record AppleSignInNotificationAccepted(
        @Schema(defaultValue = "accepted")
        String status
) {
    public static AppleSignInNotificationAccepted accepted() {
        return new AppleSignInNotificationAccepted("accepted");
    }
}
