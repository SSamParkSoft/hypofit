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

    private static final String SELECT = "select n.*, exists(select 1 from service_maintenances m where m.notice_id = n.id) as managed_by_maintenance from notices n";

    private static final RowMapper<NoticeRecord> ROW_MAPPER = NoticePersistenceAdapter::map;
    private final NamedParameterJdbcTemplate jdbc;

    public NoticePersistenceAdapter(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<NoticeRecord> listPublished() {
        return jdbc.query(SELECT + " where n.status = 'PUBLISHED' order by n.published_at desc nulls last, n.created_at desc", Map.of(), ROW_MAPPER);
    }

    @Override
    public Optional<NoticeRecord> findPublished(UUID id) {
        return jdbc.query(SELECT + " where n.id = :id and n.status = 'PUBLISHED'", Map.of("id", id), ROW_MAPPER)
                .stream().findFirst();
    }

    @Override
    public List<NoticeRecord> listAll() {
        return jdbc.query(SELECT + " order by n.updated_at desc", Map.of(), ROW_MAPPER);
    }

    @Override
    public Optional<NoticeRecord> find(UUID id) {
        return jdbc.query(SELECT + " where n.id = :id", Map.of("id", id), ROW_MAPPER).stream().findFirst();
    }

    @Override
    public Optional<NoticeRecord> findForUpdate(UUID id) {
        return jdbc.query(SELECT + " where n.id = :id for update of n", Map.of("id", id), ROW_MAPPER).stream().findFirst();
    }

    @Override
    public boolean delete(UUID id) {
        return jdbc.update("""
                delete from notices n
                where n.id = :id
                  and not exists (select 1 from service_maintenances m where m.notice_id = n.id)
                """, Map.of("id", id)) == 1;
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
                row.getObject("updated_by", UUID.class), row.getObject("created_at", OffsetDateTime.class), row.getObject("updated_at", OffsetDateTime.class), row.getBoolean("managed_by_maintenance"));
    }
}
