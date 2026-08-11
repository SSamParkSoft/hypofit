package com.contentruck.hypofit.push.application;

public class PushProviderException extends RuntimeException {

    private final String code;

    public PushProviderException(String message, String code) {
        super(message);
        this.code = code == null || code.isBlank() ? "push_provider_error" : code;
    }

    public String getCode() {
        return code;
    }
}
