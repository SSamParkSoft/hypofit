package com.contentruck.hypofit.ai.service;

import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.ApplicationSummarySource;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.InterviewSummarySource;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Component;

@Component
public class AiSummarySourceHasher {

    private final ObjectMapper objectMapper;

    public AiSummarySourceHasher(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String hashInterview(InterviewSummarySource source) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("title", source.title());
        node.put("service_summary", source.serviceSummary());
        node.put("target_description", source.targetDescription());
        node.put("reward_amount", source.rewardAmount());
        node.put("duration_minutes", source.durationMinutes());
        node.put("recruit_count", source.recruitCount());
        node.put("interview_mode", source.interviewMode());
        putNullable(node, "location_text", source.publicLocationText());
        ArrayNode schedules = node.putArray("schedule_options");
        source.scheduleOptions().forEach(schedules::add);
        return sha256(node);
    }

    public String hashApplication(ApplicationSummarySource source) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("interview_title", source.interviewTitle());
        node.put("target_description", source.targetDescription());
        ObjectNode answers = node.putObject("answers");
        for (Map.Entry<String, String> entry : new TreeMap<>(source.answers()).entrySet()) {
            answers.put(entry.getKey(), entry.getValue());
        }
        ArrayNode availableTimes = node.putArray("available_times");
        source.availableTimes().forEach(availableTimes::add);
        return sha256(node);
    }

    private void putNullable(ObjectNode node, String field, String value) {
        if (value == null) {
            node.putNull(field);
        } else {
            node.put(field, value);
        }
    }

    private String sha256(ObjectNode node) {
        try {
            byte[] canonical = objectMapper.writeValueAsString(node).getBytes(StandardCharsets.UTF_8);
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Could not hash AI summary source", exception);
        }
    }
}
