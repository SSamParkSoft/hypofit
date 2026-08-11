package com.contentruck.hypofit.interviewview.persistence;

import com.contentruck.hypofit.interviewview.application.InterviewPostViewRepository;
import com.contentruck.hypofit.interviewview.domain.InterviewPostViewReadModel;
import com.contentruck.hypofit.interviewview.domain.InterviewPostViewSource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InterviewPostViewPersistenceAdapter implements InterviewPostViewRepository {

    private final InterviewPostViewUserAccountJpaRepository userAccountJpaRepository;
    private final InterviewPostViewJpaRepository interviewPostViewJpaRepository;
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public InterviewPostViewPersistenceAdapter(
            InterviewPostViewUserAccountJpaRepository userAccountJpaRepository,
            InterviewPostViewJpaRepository interviewPostViewJpaRepository,
            NamedParameterJdbcTemplate jdbcTemplate
    ) {
        this.userAccountJpaRepository = userAccountJpaRepository;
        this.interviewPostViewJpaRepository = interviewPostViewJpaRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<ViewerAccountRecord> findViewerAccount(UUID userId) {
        return userAccountJpaRepository.findById(userId)
                .map(user -> new ViewerAccountRecord(
                        user.getId(),
                        user.getDeactivatedAt(),
                        user.getDeletedAt()
                ));
    }

    @Override
    public List<InterviewPostViewReadModel> listViewsForUser(UUID userId) {
        return interviewPostViewJpaRepository.findByUserIdOrderByLastViewedAtDesc(userId)
                .stream()
                .map(this::toReadModel)
                .toList();
    }

    @Override
    public Optional<InterviewPostViewReadModel> upsertView(
            UUID userId,
            UUID postId,
            InterviewPostViewSource source,
            OffsetDateTime viewedAt
    ) {
        List<InterviewPostViewReadModel> rows = jdbcTemplate.query(
                UPSERT_SQL,
                new MapSqlParameterSource()
                        .addValue("id", UUID.randomUUID())
                        .addValue("user_id", userId)
                        .addValue("post_id", postId)
                        .addValue("source", source.value())
                        .addValue("viewed_at", viewedAt),
                viewRowMapper()
        );
        return rows.stream().findFirst();
    }

    private InterviewPostViewReadModel toReadModel(InterviewPostViewEntity entity) {
        return new InterviewPostViewReadModel(
                entity.getId(),
                entity.getUserId(),
                entity.getInterviewPostId(),
                entity.getFirstViewedAt(),
                entity.getLastViewedAt(),
                entity.getViewCount(),
                InterviewPostViewSource.fromValue(entity.getSource())
        );
    }

    private RowMapper<InterviewPostViewReadModel> viewRowMapper() {
        return (resultSet, rowNum) -> new InterviewPostViewReadModel(
                uuid(resultSet, "id"),
                uuid(resultSet, "user_id"),
                uuid(resultSet, "interview_post_id"),
                resultSet.getObject("first_viewed_at", OffsetDateTime.class),
                resultSet.getObject("last_viewed_at", OffsetDateTime.class),
                resultSet.getInt("view_count"),
                InterviewPostViewSource.fromValue(resultSet.getString("source"))
        );
    }

    private UUID uuid(ResultSet resultSet, String column) throws SQLException {
        return resultSet.getObject(column, UUID.class);
    }

    private static final String UPSERT_SQL = """
            with existing_post as (
              select id
              from interview_posts
              where id = :post_id
            ),
            upserted as (
              insert into interview_post_views (
                id,
                user_id,
                interview_post_id,
                first_viewed_at,
                last_viewed_at,
                view_count,
                source,
                created_at,
                updated_at
              )
              select
                :id,
                :user_id,
                :post_id,
                :viewed_at,
                :viewed_at,
                1,
                :source,
                :viewed_at,
                :viewed_at
              from existing_post
              on conflict (user_id, interview_post_id) do update
                set last_viewed_at = excluded.last_viewed_at,
                    view_count = interview_post_views.view_count + 1,
                    source = excluded.source,
                    updated_at = excluded.updated_at
              returning
                id,
                user_id,
                interview_post_id,
                first_viewed_at,
                last_viewed_at,
                view_count,
                source
            )
            select
              id,
              user_id,
              interview_post_id,
              first_viewed_at,
              last_viewed_at,
              view_count,
              source
            from upserted
            """;
}
