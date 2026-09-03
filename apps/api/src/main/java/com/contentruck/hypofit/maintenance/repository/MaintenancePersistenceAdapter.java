package com.contentruck.hypofit.maintenance.repository;

import com.contentruck.hypofit.maintenance.service.MaintenanceRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MaintenancePersistenceAdapter implements MaintenanceRepository {
    private static final RowMapper<MaintenanceRecord> ROW = MaintenancePersistenceAdapter::map;
    private final NamedParameterJdbcTemplate jdbc;
    public MaintenancePersistenceAdapter(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override public List<MaintenanceRecord> list() { return jdbc.query("select * from service_maintenances order by starts_at desc", Map.of(), ROW); }
    @Override public Optional<MaintenanceRecord> find(UUID id) { return jdbc.query("select * from service_maintenances where id = :id", Map.of("id", id), ROW).stream().findFirst(); }
    @Override public Optional<MaintenanceRecord> findActive() { return jdbc.query("select * from service_maintenances where status in ('IN_PROGRESS', 'VERIFYING') order by started_at desc limit 1", Map.of(), ROW).stream().findFirst(); }
    @Override public Optional<MaintenanceRecord> findVisibleScheduled(OffsetDateTime now) { return jdbc.query("""
            select * from service_maintenances where status = 'SCHEDULED' and show_banner = true
              and banner_starts_at is not null and banner_starts_at <= :now and starts_at > :now
            order by starts_at asc limit 1
            """, Map.of("now", now), ROW).stream().findFirst(); }
    @Override public MaintenanceRecord create(UUID actorId, WriteCommand c) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into service_maintenances (id,title,message,status,mode,starts_at,ends_at,show_banner,banner_starts_at,created_by,updated_by)
            values (:id,:title,:message,'SCHEDULED','FULL',:startsAt,:endsAt,:showBanner,:bannerStartsAt,:actorId,:actorId)
            """, params(id, actorId, c));
        return find(id).orElseThrow();
    }
    @Override public MaintenanceRecord createInProgress(UUID actorId, WriteCommand c, OffsetDateTime now) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into service_maintenances (id,title,message,status,mode,starts_at,ends_at,show_banner,banner_starts_at,created_by,updated_by,started_at)
            values (:id,:title,:message,'IN_PROGRESS','FULL',:startsAt,:endsAt,false,null,:actorId,:actorId,:now)
            """, params(id, actorId, c).addValue("now", now));
        return find(id).orElseThrow();
    }
    @Override public void linkNotice(UUID id, UUID noticeId) {
        jdbc.update("update service_maintenances set notice_id = :noticeId, updated_at = now(), version = version + 1 where id = :id", Map.of("id", id, "noticeId", noticeId));
    }
    @Override public MaintenanceRecord update(UUID id, UUID actorId, WriteCommand c) {
        int changed = jdbc.update("""
            update service_maintenances set title=:title,message=:message,starts_at=:startsAt,ends_at=:endsAt,show_banner=:showBanner,
              banner_starts_at=:bannerStartsAt,updated_by=:actorId,updated_at=now(),version=version+1 where id=:id and status='SCHEDULED'
            """, params(id, actorId, c));
        return changed == 0 ? null : find(id).orElseThrow();
    }
    @Override public MaintenanceRecord transition(UUID id, UUID actorId, String from, String to, OffsetDateTime now) {
        MapSqlParameterSource p = new MapSqlParameterSource().addValue("id", id).addValue("actorId", actorId).addValue("from", from).addValue("to", to).addValue("now", now);
        int updated = jdbc.update("""
            update service_maintenances set status=:to, updated_by=:actorId, updated_at=:now, version=version+1,
              started_at=case when :to = 'IN_PROGRESS' then :now else started_at end,
              completed_at=case when :to = 'COMPLETED' then :now else completed_at end
            where id=:id and status=:from
            """, p);
        return updated == 0 ? null : find(id).orElseThrow();
    }
    private MapSqlParameterSource params(UUID id, UUID actorId, WriteCommand c) { return new MapSqlParameterSource().addValue("id", id).addValue("actorId", actorId).addValue("title", c.title()).addValue("message", c.message()).addValue("startsAt", c.startsAt()).addValue("endsAt", c.endsAt()).addValue("showBanner", c.showBanner()).addValue("bannerStartsAt", c.bannerStartsAt()); }
    private static MaintenanceRecord map(ResultSet r, int ignored) throws SQLException { return new MaintenanceRecord(r.getObject("id", UUID.class), r.getString("title"), r.getString("message"), r.getString("status"), r.getString("mode"), r.getObject("starts_at", OffsetDateTime.class), r.getObject("ends_at", OffsetDateTime.class), r.getObject("notice_id", UUID.class), r.getBoolean("show_banner"), r.getObject("banner_starts_at", OffsetDateTime.class), r.getObject("created_by", UUID.class), r.getObject("updated_by", UUID.class), r.getObject("started_at", OffsetDateTime.class), r.getObject("completed_at", OffsetDateTime.class), r.getLong("version"), r.getObject("created_at", OffsetDateTime.class), r.getObject("updated_at", OffsetDateTime.class)); }
}
