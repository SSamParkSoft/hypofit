package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ConfiguredInterviewAdminPolicy implements InterviewAdminPolicy {

    private final Set<String> adminEmails;

    public ConfiguredInterviewAdminPolicy(HypofitProperties properties) {
        this.adminEmails = properties.getAdminEmails().stream()
                .filter(email -> email != null && !email.isBlank())
                .map(email -> email.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public boolean isAdminEmail(String email) {
        return email != null && adminEmails.contains(email.trim().toLowerCase(Locale.ROOT));
    }
}
