package com.contentruck.hypofit.interviewview.service;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum InterviewPostViewSource {
    HOME("home"),
    INTERVIEWS("interviews"),
    MAP("map"),
    DETAIL("detail"),
    CHAT("chat");

    private final String value;

    InterviewPostViewSource(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static InterviewPostViewSource fromValue(String value) {
        return Arrays.stream(values())
                .filter(candidate -> candidate.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown interview post view source: " + value));
    }
}
