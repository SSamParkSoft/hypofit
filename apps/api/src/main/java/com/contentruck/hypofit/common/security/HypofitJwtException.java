package com.contentruck.hypofit.common.security;

import org.springframework.security.oauth2.jwt.JwtException;

public class HypofitJwtException extends JwtException {

    private final String code;
    private final String userMessage;
    private final int status;
    private final String debugMessage;

    public HypofitJwtException(
            String code,
            String userMessage,
            int status,
            String debugMessage,
            Throwable cause
    ) {
        super(debugMessage, cause);
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
