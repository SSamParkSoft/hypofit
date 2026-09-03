package com.contentruck.hypofit.admin.repository;

import com.contentruck.hypofit.admin.service.AdminAccessRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminAccessPersistenceAdapter implements AdminAccessRepository {

    private static final RowMapper<AdminActorRecord> ADMIN_ACTOR_ROW_MAPPER = AdminAccessPersistenceAdapter::mapAdminActor;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public AdminAccessPersistenceAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<AdminActorRecord> findActorAccount(UUID userId) {
        return jdbcTemplate.query("""
                        select id, email, name, deleted_at, deactivated_at
                        from app_users
                        where id = :userId
                        limit 1
                        """, Map.of("userId", userId), ADMIN_ACTOR_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    @Override
    public boolean isAdmin(UUID userId) {
        Integer count = jdbcTemplate.queryForObject("""
                        select count(*)
                        from admin_users
                        where user_id = :userId
                        """, Map.of("userId", userId), Integer.class);
        return count != null && count > 0;
    }

    private static AdminActorRecord mapAdminActor(ResultSet resultSet, int rowNum) throws SQLException {
        return new AdminActorRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("email"),
                resultSet.getString("name"),
                resultSet.getObject("deleted_at", java.time.OffsetDateTime.class),
                resultSet.getObject("deactivated_at", java.time.OffsetDateTime.class)
        );
    }
}
