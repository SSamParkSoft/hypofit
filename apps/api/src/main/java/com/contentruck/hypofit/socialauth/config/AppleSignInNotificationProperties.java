package com.contentruck.hypofit.socialauth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "hypofit.apple-sign-in")
public class AppleSignInNotificationProperties {

    private String appId = "";
    private String jwksUrl = "https://appleid.apple.com/auth/keys";
    private int jwksCacheSeconds = 300;

    public String getAppId() {
        return appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public String getJwksUrl() {
        return jwksUrl;
    }

    public void setJwksUrl(String jwksUrl) {
        this.jwksUrl = jwksUrl;
    }

    public int getJwksCacheSeconds() {
        return jwksCacheSeconds;
    }

    public void setJwksCacheSeconds(int jwksCacheSeconds) {
        this.jwksCacheSeconds = jwksCacheSeconds;
    }
}
