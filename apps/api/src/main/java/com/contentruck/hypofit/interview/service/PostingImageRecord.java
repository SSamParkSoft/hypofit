package com.contentruck.hypofit.interview.service;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PostingImageRecord(
        UUID id, UUID ownerId, UUID postId, Integer position, String status,
        String uploadPath, String storagePath, String thumbnailPath,
        Integer width, Integer height, String altText, OffsetDateTime expiresAt
) {
}
