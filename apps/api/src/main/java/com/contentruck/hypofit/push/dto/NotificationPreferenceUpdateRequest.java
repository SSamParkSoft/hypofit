package com.contentruck.hypofit.push.dto;


import com.contentruck.hypofit.push.service.PushCommands.UpdateNotificationPreferenceCommand;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "NotificationPreferenceUpdate")
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class NotificationPreferenceUpdateRequest {

    @Schema(nullable = true)
    private Boolean pushEnabled;
    @Schema(nullable = true)
    private Boolean chatPushEnabled;
    @Schema(nullable = true)
    private Boolean applicationPushEnabled;
    @Schema(nullable = true)
    private Boolean sessionPushEnabled;
    @Schema(nullable = true)
    private Boolean supportPushEnabled;
    @Schema(nullable = true)
    private Boolean marketingPushEnabled;
    private boolean pushEnabledPresent;
    private boolean chatPushEnabledPresent;
    private boolean applicationPushEnabledPresent;
    private boolean sessionPushEnabledPresent;
    private boolean supportPushEnabledPresent;
    private boolean marketingPushEnabledPresent;

    public Boolean getPushEnabled() {
        return pushEnabled;
    }

    public void setPushEnabled(Boolean pushEnabled) {
        this.pushEnabled = pushEnabled;
        this.pushEnabledPresent = true;
    }

    public Boolean getChatPushEnabled() {
        return chatPushEnabled;
    }

    public void setChatPushEnabled(Boolean chatPushEnabled) {
        this.chatPushEnabled = chatPushEnabled;
        this.chatPushEnabledPresent = true;
    }

    public Boolean getApplicationPushEnabled() {
        return applicationPushEnabled;
    }

    public void setApplicationPushEnabled(Boolean applicationPushEnabled) {
        this.applicationPushEnabled = applicationPushEnabled;
        this.applicationPushEnabledPresent = true;
    }

    public Boolean getSessionPushEnabled() {
        return sessionPushEnabled;
    }

    public void setSessionPushEnabled(Boolean sessionPushEnabled) {
        this.sessionPushEnabled = sessionPushEnabled;
        this.sessionPushEnabledPresent = true;
    }

    public Boolean getSupportPushEnabled() {
        return supportPushEnabled;
    }

    public void setSupportPushEnabled(Boolean supportPushEnabled) {
        this.supportPushEnabled = supportPushEnabled;
        this.supportPushEnabledPresent = true;
    }

    public Boolean getMarketingPushEnabled() {
        return marketingPushEnabled;
    }

    public void setMarketingPushEnabled(Boolean marketingPushEnabled) {
        this.marketingPushEnabled = marketingPushEnabled;
        this.marketingPushEnabledPresent = true;
    }

    public UpdateNotificationPreferenceCommand toCommand() {
        return new UpdateNotificationPreferenceCommand(
                pushEnabledPresent,
                pushEnabled,
                chatPushEnabledPresent,
                chatPushEnabled,
                applicationPushEnabledPresent,
                applicationPushEnabled,
                sessionPushEnabledPresent,
                sessionPushEnabled,
                supportPushEnabledPresent,
                supportPushEnabled,
                marketingPushEnabledPresent,
                marketingPushEnabled
        );
    }
}
