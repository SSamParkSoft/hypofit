package com.contentruck.hypofit.notice.repository;

import com.contentruck.hypofit.notice.service.NoticeRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NoticePersistenceAdapter implements NoticeRepository {

    private static final RowMapper<NoticeRecord> ROW_MAPPER = NoticePersistenceAdapter::map;
    private final NamedParameterJdbcTemplate jdbc;

    public NoticePersistenceAdapter(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<NoticeRecord> listPublished() {
        return jdbc.query("""
                select * from notices where status = 'PUBLISHED'
                order by published_at desc nulls last, created_at desc
                """, Map.of(), ROW_MAPPER);
    }

    @Override
    public Optional<NoticeRecord> findPublished(UUID id) {
        return jdbc.query("select * from notices where id = :id and status = 'PUBLISHED'", Map.of("id", id), ROW_MAPPER)
                .stream().findFirst();
    }

    @Override
    public List<NoticeRecord> listAll() {
        return jdbc.query("select * from notices order by updated_at desc", Map.of(), ROW_MAPPER);
    }

    @Override
    public Optional<NoticeRecord> find(UUID id) {
        return jdbc.query("select * from notices where id = :id", Map.of("id", id), ROW_MAPPER).stream().findFirst();
    }

    @Override
    public NoticeRecord insert(UUID actorId, NoticeWriteCommand command) {
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbc.update("""
                insert into notices (id, type, title, body, status, created_by, updated_by, created_at, updated_at)
                values (:id, :type, :title, :body, 'DRAFT', :actorId, :actorId, :now, :now)
                """, Map.of("id", id, "type", command.type(), "title", command.title(), "body", command.body(), "actorId", actorId, "now", now));
        return find(id).orElseThrow();
    }

    @Override
    public NoticeRecord update(UUID id, UUID actorId, NoticeWriteCommand command) {
        jdbc.update("""
                update notices set type = :type, title = :title, body = :body, updated_by = :actorId, updated_at = now()
                where id = :id
                """, Map.of("id", id, "type", command.type(), "title", command.title(), "body", command.body(), "actorId", actorId));
        return find(id).orElseThrow();
    }

    @Override
    public NoticeRecord changeStatus(UUID id, UUID actorId, String fromStatus, String toStatus, OffsetDateTime publishedAt) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("toStatus", toStatus)
                .addValue("publishedAt", publishedAt)
                .addValue("actorId", actorId)
                .addValue("fromStatus", fromStatus);
        int changed = jdbc.update("""
                update notices
                set status = :toStatus, published_at = :publishedAt, updated_by = :actorId, updated_at = now()
                where id = :id and status = :fromStatus
                """, parameters);
        if (changed == 0) return null;
        return find(id).orElseThrow();
    }

    private static NoticeRecord map(ResultSet row, int ignored) throws SQLException {
        return new NoticeRecord(row.getObject("id", UUID.class), row.getString("type"), row.getString("title"), row.getString("body"),
                row.getString("status"), row.getObject("published_at", OffsetDateTime.class), row.getObject("created_by", UUID.class),
                row.getObject("updated_by", UUID.class), row.getObject("created_at", OffsetDateTime.class), row.getObject("updated_at", OffsetDateTime.class));
    }
}
