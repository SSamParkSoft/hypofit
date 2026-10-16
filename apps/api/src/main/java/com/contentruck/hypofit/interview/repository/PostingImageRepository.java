package com.contentruck.hypofit.interview.repository;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.interview.service.PostingImageRecord;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PostingImageRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public PostingImageRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void lockActiveOwner(UUID ownerId) {
        List<UUID> users = jdbc.query("""
                select id from app_users where id = :id and deleted_at is null and deactivated_at is null for update
                """, Map.of("id", ownerId), (rs, index) -> rs.getObject("id", UUID.class));
        if (users.isEmpty()) throw new HypofitException("posting_image_account_unavailable", "계정을 확인해 주세요.", 403, null);
    }

    public void lockPost(UUID postId, UUID ownerId) {
        List<UUID> posts = jdbc.query("""
                select id from interview_posts where id = :id and founder_id = :owner for update
                """, Map.of("id", postId, "owner", ownerId), (rs, index) -> rs.getObject("id", UUID.class));
        if (posts.isEmpty()) throw new HypofitException("posting_image_not_found", "공고를 찾을 수 없어요.", 404, null);
    }

    public boolean reserveLimitExceeded(UUID ownerId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                select count(*) filter (where post_id is null and status in ('pending_upload','processing','ready')) >= 6
                    or count(*) filter (where created_at > now() - interval '1 minute') >= 10
                from posting_images where owner_id = :owner
                """, Map.of("owner", ownerId), Boolean.class));
    }

    public PostingImageRecord reserve(UUID ownerId, String extension, String altText) {
        UUID id = UUID.randomUUID();
        String upload = "uploads/" + ownerId + "/" + id + "/source." + extension;
        String base = "images/" + ownerId + "/" + id + "/";
        jdbc.update("""
                insert into posting_images(id,owner_id,status,upload_path,storage_path,thumbnail_path,alt_text,expires_at)
                values (:id,:owner,'pending_upload',:upload,:detail,:thumb,:alt,now() + interval '3 hours')
                """, new org.springframework.jdbc.core.namedparam.MapSqlParameterSource()
                .addValue("id", id).addValue("owner", ownerId).addValue("upload", upload)
                .addValue("detail", base + "detail.jpg").addValue("thumb", base + "thumbnail.jpg").addValue("alt", altText));
        return get(id);
    }

    public PostingImageRecord get(UUID id) {
        return jdbc.query("select * from posting_images where id = :id", Map.of("id", id), this::map)
                .stream().findFirst().orElseThrow(() -> new HypofitException(
                        "posting_image_not_found", "이미지를 찾을 수 없어요.", 404, null));
    }

    public boolean claim(UUID id, UUID ownerId) {
        return jdbc.update("""
                update posting_images set status='processing',updated_at=now()
                where id=:id and owner_id=:owner and expires_at > now()
                  and (status='pending_upload' or (status='processing' and updated_at < now()-interval '2 minutes'))
                """, Map.of("id", id, "owner", ownerId)) == 1;
    }

    public void ready(UUID id, int size, int width, int height) {
        jdbc.update("""
                update posting_images set status='ready',byte_size=:size,width=:width,height=:height,
                  updated_at=now(),expires_at=now()+interval '7 days' where id=:id and status='processing'
                """, Map.of("id", id, "size", size, "width", width, "height", height));
    }

    public void releaseClaim(UUID id) {
        jdbc.update("update posting_images set status='pending_upload',updated_at=now() where id=:id and status='processing'",
                Map.of("id", id));
    }

    public List<PostingImageRecord> forPosts(List<UUID> ids) {
        if (ids.isEmpty()) return List.of();
        return jdbc.query("""
                select i.* from posting_images i join app_users u on u.id=i.owner_id
                where i.post_id in (:ids) and i.status='ready' and u.deleted_at is null order by i.position
                """,
                Map.of("ids", ids), this::map);
    }

    public List<UUID> attachedIds(UUID postId) {
        return forPosts(List.of(postId)).stream().map(PostingImageRecord::id).toList();
    }

    public List<PostingImageRecord> lockImages(List<UUID> ids) {
        if (ids.isEmpty()) return List.of();
        return jdbc.query("select * from posting_images where id in (:ids) order by id for update", Map.of("ids", ids), this::map);
    }

    public void attach(UUID postId, List<UUID> ids) {
        List<UUID> old = attachedIds(postId);
        for (UUID id : old) {
            if (!ids.contains(id)) jdbc.update("""
                    update posting_images set post_id=null,position=null,status='delete_pending',updated_at=now() where id=:id
                    """, Map.of("id", id));
        }
        for (int i = 0; i < ids.size(); i++) jdbc.update("""
                update posting_images set post_id=:post,position=:position,updated_at=now() where id=:id
                """, Map.of("id", ids.get(i), "post", postId, "position", i));
    }

    public void cancel(UUID id, UUID ownerId) {
        int changed = jdbc.update("""
                update posting_images set status='delete_pending',updated_at=now()
                where id=:id and owner_id=:owner and post_id is null and status not in ('processing','deleted')
                """, Map.of("id", id, "owner", ownerId));
        if (changed == 0) throw new HypofitException("posting_image_not_available", "연결된 이미지나 처리 중인 이미지는 삭제할 수 없어요.", 409, null);
    }

    public List<PostingImageRecord> cleanupBatch() {
        jdbc.update("""
                update posting_images set status='pending_upload',updated_at=now()
                where status='processing' and updated_at < now()-interval '2 minutes'
                """, Map.of());
        // Lock only selected assets; attachment rechecks state after taking the same lock.
        List<PostingImageRecord> candidates = jdbc.query("""
                select i.* from posting_images i
                join app_users u on u.id=i.owner_id left join interview_posts p on p.id=i.post_id
                where i.status <> 'deleted' and i.status <> 'processing'
                  and (i.status='delete_pending' or (i.post_id is null and i.expires_at < now())
                    or u.deleted_at is not null or p.status='removed')
                order by i.updated_at limit 20 for update of i skip locked
                """, Map.of(), this::map);
        for (PostingImageRecord row : candidates) jdbc.update("""
                update posting_images set status='delete_pending',post_id=null,position=null,updated_at=now() where id=:id
                """, Map.of("id", row.id()));
        return candidates;
    }

    public void deleted(UUID id) {
        // Pending upload tokens live 2h. Retain a tombstone and sweep once more after token expiry.
        jdbc.update("""
                update posting_images set status=case when created_at < now()-interval '3 hours' then 'deleted' else 'delete_pending' end,
                  alt_text=null,updated_at=now() where id=:id and status='delete_pending'
                """, Map.of("id", id));
    }

    public List<PostingImageRecord> expiredSources() {
        return jdbc.query("""
                select * from posting_images where status='ready' and source_deleted=false
                and created_at < now()-interval '3 hours' limit 20
                """, Map.of(), this::map);
    }

    public void sourceDeleted(UUID id) {
        jdbc.update("update posting_images set source_deleted=true where id=:id", Map.of("id", id));
    }

    private PostingImageRecord map(ResultSet rs, int index) throws SQLException {
        return new PostingImageRecord(rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class),
                rs.getObject("post_id", UUID.class), (Integer) rs.getObject("position"), rs.getString("status"),
                rs.getString("upload_path"), rs.getString("storage_path"), rs.getString("thumbnail_path"),
                (Integer) rs.getObject("width"), (Integer) rs.getObject("height"), rs.getString("alt_text"),
                rs.getObject("expires_at", OffsetDateTime.class));
    }
}
