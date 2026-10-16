package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.interview.client.SupabasePostingImageClient;
import com.contentruck.hypofit.interview.repository.PostingImageRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PostingImageService {
    public record Upload(UUID id, String path, String token) { }
    public record SignedImage(UUID id, String url, OffsetDateTime urlExpiresAt, int width, int height, String altText) { }
    private static final Logger LOG = LoggerFactory.getLogger(PostingImageService.class);
    private final HypofitProperties properties;
    private final PostingImageRepository repository;
    private final SupabasePostingImageClient storage;
    private final PostingImageProcessor processor;
    private final TransactionTemplate transaction;
    // One decoder at a time keeps the existing 320 MiB JVM heap within the MVP budget.
    private final Semaphore processingSlots = new Semaphore(1);

    public PostingImageService(HypofitProperties properties, PostingImageRepository repository,
            SupabasePostingImageClient storage, PostingImageProcessor processor, PlatformTransactionManager manager) {
        this.properties = properties;
        this.repository = repository;
        this.storage = storage;
        this.processor = processor;
        transaction = new TransactionTemplate(manager);
    }

    public boolean enabled() {
        return properties.isPostingImagesEnabled();
    }

    public Upload reserve(UUID ownerId, String mimeType, String altText) {
        requireEnabled();
        if (!List.of("image/jpeg", "image/png").contains(mimeType == null ? "" : mimeType)) throw invalid();
        if (altText != null && altText.length() > 200) throw invalid();
        PostingImageRecord image = transaction.execute(status -> {
            repository.lockActiveOwner(ownerId);
            if (repository.reserveLimitExceeded(ownerId)) throw new HypofitException(
                    "posting_image_upload_limit", "기존 이미지 업로드를 마치거나 잠시 후 다시 시도해 주세요.", 429, null);
            return repository.reserve(ownerId, "image/png".equals(mimeType) ? "png" : "jpg", altText);
        });
        try {
            return new Upload(image.id(), image.uploadPath(), storage.uploadToken(image.uploadPath()));
        } catch (RuntimeException exception) {
            repository.cancel(image.id(), ownerId);
            throw exception;
        }
    }

    public UUID complete(UUID ownerId, UUID id) {
        requireEnabled();
        transaction.executeWithoutResult(status -> repository.lockActiveOwner(ownerId));
        PostingImageRecord image = owned(ownerId, id);
        if ("ready".equals(image.status())) return id;
        if (!processingSlots.tryAcquire()) throw new HypofitException(
                "posting_image_processing_busy", "이미지를 처리 중이에요. 잠시 후 다시 시도해 주세요.", 429, null);
        boolean claimed = false;
        try {
            claimed = repository.claim(id, ownerId);
            if (!claimed) throw new HypofitException("posting_image_not_ready", "업로드 상태를 확인한 뒤 다시 시도해 주세요.", 409, null);
            PostingImageProcessor.Processed result = processor.process(storage.download(image.uploadPath()));
            // Only this service writes final paths. Clear incomplete outputs before a bounded completion retry.
            storage.remove(List.of(image.storagePath(), image.thumbnailPath()));
            storage.upload(image.storagePath(), result.detail());
            storage.upload(image.thumbnailPath(), result.thumbnail());
            repository.ready(id, result.detail().length, result.width(), result.height());
            // The raw object is swept after its signed upload token expires, rather than being re-uploadable immediately.
            return id;
        } catch (RuntimeException exception) {
            if (claimed) repository.releaseClaim(id);
            throw exception;
        } finally {
            processingSlots.release();
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void lockOwnerForImageWrite(UUID ownerId, List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return;
        requireEnabled();
        // Acquire before inserting a posting's owner FK; simultaneous inserts must not both upgrade key-share locks.
        repository.lockActiveOwner(ownerId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void attach(UUID ownerId, UUID postId, List<UUID> ids) {
        if (ids == null) return;
        if (!enabled() && ids.isEmpty()) return;
        requireEnabled();
        if (ids.size() > 3 || new HashSet<>(ids).size() != ids.size()) throw invalid();
        repository.lockActiveOwner(ownerId);
        repository.lockPost(postId, ownerId);
        List<PostingImageRecord> images = repository.lockImages(ids);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (images.size() != ids.size() || images.stream().anyMatch(image ->
                !ownerId.equals(image.ownerId()) || !"ready".equals(image.status())
                    || (image.postId() == null && image.expiresAt().isBefore(now))
                    || (image.postId() != null && !postId.equals(image.postId())))) throw invalid();
        repository.attach(postId, ids);
    }

    public boolean replayMatches(UUID postId, List<UUID> ids) {
        if (!enabled()) return ids == null || ids.isEmpty();
        return repository.attachedIds(postId).equals(ids == null ? List.of() : ids);
    }

    @Transactional
    public void cancel(UUID ownerId, UUID id) {
        requireEnabled();
        repository.lockActiveOwner(ownerId);
        repository.lockImages(List.of(id));
        owned(ownerId, id);
        repository.cancel(id, ownerId);
    }

    /** Input must already be authorized by the existing posting query service. */
    public Map<UUID, List<SignedImage>> forVisiblePosts(List<UUID> postIds, boolean detail) {
        if (!enabled() || postIds.isEmpty()) return Map.of();
        List<PostingImageRecord> rows = repository.forPosts(postIds);
        List<String> paths = rows.stream().filter(row -> detail || row.position() == 0)
                .map(row -> detail ? row.storagePath() : row.thumbnailPath()).toList();
        Map<String, String> urls;
        try {
            urls = storage.sign(paths);
        } catch (HypofitException exception) {
            LOG.warn("Posting image URL signing unavailable; preserving image metadata without URLs");
            urls = Map.of();
        }
        Map<UUID, List<SignedImage>> result = new HashMap<>();
        OffsetDateTime expiresAt = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(15);
        for (PostingImageRecord row : rows) {
            if (!detail && row.position() != 0) continue;
            String url = urls.get(detail ? row.storagePath() : row.thumbnailPath());
            result.computeIfAbsent(row.postId(), ignored -> new ArrayList<>()).add(
                    new SignedImage(row.id(), url, expiresAt, row.width(), row.height(), row.altText()));
        }
        return result;
    }

    @Scheduled(fixedDelay = 300_000, initialDelay = 60_000)
    public void cleanup() {
        if (!enabled()) return;
        try {
            for (PostingImageRecord image : repository.expiredSources()) {
                try {
                    storage.remove(List.of(image.uploadPath()));
                    repository.sourceDeleted(image.id());
                } catch (HypofitException exception) {
                    LOG.warn("Posting image source cleanup pending for asset {}", image.id());
                }
            }
            List<PostingImageRecord> rows = transaction.execute(status -> repository.cleanupBatch());
            for (PostingImageRecord image : rows) {
                try {
                    storage.remove(List.of(image.uploadPath(), image.storagePath(), image.thumbnailPath()));
                    repository.deleted(image.id());
                } catch (HypofitException exception) {
                    LOG.warn("Posting image cleanup pending for asset {}", image.id());
                }
            }
        } catch (RuntimeException exception) {
            LOG.warn("Posting image cleanup batch failed; will retry without exposing provider details");
        }
    }

    private PostingImageRecord owned(UUID ownerId, UUID id) {
        PostingImageRecord image = repository.get(id);
        if (!ownerId.equals(image.ownerId())) throw new HypofitException(
                "posting_image_not_found", "이미지를 찾을 수 없어요.", 404, null);
        return image;
    }

    private void requireEnabled() {
        if (!enabled()) throw new HypofitException("posting_images_disabled", "공고 이미지 기능을 준비 중이에요.", 503, null);
    }

    private HypofitException invalid() {
        return new HypofitException("posting_image_invalid", "공고에 사용할 이미지를 확인해 주세요.", 400, null);
    }
}
