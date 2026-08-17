package com.contentruck.hypofit.push.dto;


import com.contentruck.hypofit.push.service.PushCommands.RegisterPushDeviceCommand;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "PushDeviceRegister")
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PushDeviceRegisterRequest {

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
    private String platform;
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
    private String provider;
    @Schema(defaultValue = "production")
    private String environment = "production";
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 10, maxLength = 4096)
    private String token;
    @Schema(nullable = true, maxLength = 120)
    private String installationId;
    @Schema(nullable = true, maxLength = 120)
    private String deviceLabel;
    @Schema(nullable = true, maxLength = 40)
    private String appVersion;
    @Schema(nullable = true, maxLength = 40)
    private String buildNumber;
    @Schema(nullable = true, maxLength = 80)
    private String osVersion;
    @Schema(nullable = true, maxLength = 40)
    private String locale;
    @Schema(nullable = true, maxLength = 80)
    private String timezone;
    @Schema(
            defaultValue = "granted"
    )
    private String permissionStatus = "granted";

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getInstallationId() {
        return installationId;
    }

    public void setInstallationId(String installationId) {
        this.installationId = installationId;
    }

    public String getDeviceLabel() {
        return deviceLabel;
    }

    public void setDeviceLabel(String deviceLabel) {
        this.deviceLabel = deviceLabel;
    }

    public String getAppVersion() {
        return appVersion;
    }

    public void setAppVersion(String appVersion) {
        this.appVersion = appVersion;
    }

    public String getBuildNumber() {
        return buildNumber;
    }

    public void setBuildNumber(String buildNumber) {
        this.buildNumber = buildNumber;
    }

    public String getOsVersion() {
        return osVersion;
    }

    public void setOsVersion(String osVersion) {
        this.osVersion = osVersion;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getPermissionStatus() {
        return permissionStatus;
    }

    public void setPermissionStatus(String permissionStatus) {
        this.permissionStatus = permissionStatus;
    }

    public RegisterPushDeviceCommand toCommand() {
        return new RegisterPushDeviceCommand(
                platform,
                provider,
                environment,
                token,
                installationId,
                deviceLabel,
                appVersion,
                buildNumber,
                osVersion,
                locale,
                timezone,
                permissionStatus
        );
    }
}
