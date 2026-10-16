package com.contentruck.hypofit.interview.controller;

import com.contentruck.hypofit.interview.service.PostingImageService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/posting-images")
public class PostingImageController {
    public record UploadRequest(@JsonProperty("mime_type") String mimeType, @JsonProperty("alt_text") String altText) { }
    private final PostingImageService images;

    public PostingImageController(PostingImageService images) {
        this.images = images;
    }

    @PostMapping("/uploads")
    @ResponseStatus(HttpStatus.CREATED)
    public PostingImageService.Upload reserve(@AuthenticationPrincipal Jwt jwt, @RequestBody UploadRequest request) {
        return images.reserve(UUID.fromString(jwt.getSubject()), request.mimeType(), request.altText());
    }

    @PostMapping("/{id}/complete")
    public Map<String, UUID> complete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return Map.of("id", images.complete(UUID.fromString(jwt.getSubject()), id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        images.cancel(UUID.fromString(jwt.getSubject()), id);
    }
}
