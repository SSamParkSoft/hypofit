package com.contentruck.hypofit.common.error;

public class HypofitException extends RuntimeException {

    private final String code;
    private final String userMessage;
    private final int status;
    private final String debugMessage;

    public HypofitException(String code, String userMessage, int status, String debugMessage) {
        super(debugMessage == null ? userMessage : debugMessage);
        this.code = code;
        this.userMessage = userMessage;
        this.status = status;
        this.debugMessage = debugMessage;
    }

    public String getCode() {
        return code;
    }

    public String getUserMessage() {
        return userMessage;
    }

    public int getStatus() {
        return status;
    }

    public String getDebugMessage() {
        return debugMessage;
    }
}
