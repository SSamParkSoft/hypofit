package com.contentruck.hypofit.interview.repository;

import com.contentruck.hypofit.interview.service.InterviewPostListCriteria;
import com.contentruck.hypofit.interview.service.InterviewPostReadRepository;
import com.contentruck.hypofit.interview.service.FounderReviewSummary;
import com.contentruck.hypofit.interview.service.FounderSummary;
import com.contentruck.hypofit.interview.service.InterviewAiSummaryReadModel;
import com.contentruck.hypofit.interview.service.InterviewPostReadModel;
import com.contentruck.hypofit.interview.service.PostingCompensation;
import com.contentruck.hypofit.interview.service.PostingCompensations;
import com.contentruck.hypofit.interview.service.PostingCreationConfiguration;
import com.contentruck.hypofit.interview.service.InterviewSummaryContentModel;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InterviewPostReadRepositoryAdapter implements InterviewPostReadRepository {

    private static final String INTERVIEW_RECRUITMENT_TYPE = "interview";
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<PostingCompensation>> COMPENSATION_LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<InterviewSummaryContentModel> INTERVIEW_SUMMARY_CONTENT_TYPE = new TypeReference<>() {
    };

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public InterviewPostReadRepositoryAdapter(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<InterviewPostReadModel> findPosts(InterviewPostListCriteria criteria) {
        SqlFragments fragments = buildListSql(criteria);
        return jdbcTemplate.query(fragments.sql(), fragments.parameters(), interviewPostRowMapper(false));
    }

    @Override
    public Optional<InterviewPostReadModel> findVisiblePost(UUID postId, UUID viewerId, boolean isAdmin) {
        SqlFragments fragments = buildDetailSql(postId, viewerId, isAdmin);
        List<InterviewPostReadModel> posts = jdbcTemplate.query(
                fragments.sql(),
                fragments.parameters(),
                interviewPostRowMapper(true)
        );
        return posts.stream().findFirst();
    }

    private SqlFragments buildListSql(InterviewPostListCriteria criteria) {
        MapSqlParameterSource parameters = new MapSqlParameterSource();
        List<String> whereClauses = new ArrayList<>();
        String normalizedQuery = normalizeQuery(criteria.query());
        boolean distanceEnabled = criteria.latitude() != null && criteria.longitude() != null;

        if (criteria.status() != null && !criteria.status().isBlank()) {
            whereClauses.add("p.status = :status");
            parameters.addValue("status", criteria.status());
        }

        if (!criteria.supportsRecruitmentTypes()) {
            whereClauses.add("p.recruitment_type = :legacy_recruitment_type");
            parameters.addValue("legacy_recruitment_type", INTERVIEW_RECRUITMENT_TYPE);
        }

        if (criteria.admin()) {
            if (criteria.founderId() != null) {
                whereClauses.add("p.founder_id = :founder_id");
                parameters.addValue("founder_id", criteria.founderId());
            }
        } else {
            whereClauses.add(buildVisibilityClause(criteria.viewerId(), parameters));
            whereClauses.add("p.status not in ('hidden', 'removed')");
            if (criteria.founderId() != null) {
                whereClauses.add("p.founder_id = :founder_id");
                parameters.addValue("founder_id", criteria.founderId());
            }
        }

        if (criteria.mode() != null && !criteria.mode().isBlank()) {
            whereClauses.add("p.interview_mode = :mode");
            parameters.addValue("mode", criteria.mode());
        } else if (criteria.radiusMeters() != null) {
            whereClauses.add("p.interview_mode in ('offline', 'both')");
        }

        if (criteria.rewardMin() != null) {
            whereClauses.add("p.reward_amount >= :reward_min");
            parameters.addValue("reward_min", criteria.rewardMin());
        }
        if (criteria.rewardMax() != null) {
            whereClauses.add("p.reward_amount <= :reward_max");
            parameters.addValue("reward_max", criteria.rewardMax());
        }

        if (normalizedQuery != null) {
            whereClauses.add(buildSearchMatchClause(normalizedQuery, parameters));
        }

        if (criteria.radiusMeters() != null && distanceEnabled) {
            whereClauses.add("p.location_point is not null");
            whereClauses.add(distanceWithinClause());
            parameters.addValue("lat", criteria.latitude());
            parameters.addValue("lng", criteria.longitude());
            parameters.addValue("radius_m", criteria.radiusMeters());
        } else if (distanceEnabled) {
            parameters.addValue("lat", criteria.latitude());
            parameters.addValue("lng", criteria.longitude());
        }

        parameters.addValue("limit", criteria.limit());

        StringBuilder sql = new StringBuilder(baseSelect(normalizedQuery != null, distanceEnabled, false));
        appendWhere(sql, whereClauses);
        sql.append(orderByClause(criteria.sort(), normalizedQuery != null, distanceEnabled));
        sql.append(" limit :limit");
        return new SqlFragments(sql.toString(), parameters);
    }

    private SqlFragments buildDetailSql(UUID postId, UUID viewerId, boolean isAdmin) {
        MapSqlParameterSource parameters = new MapSqlParameterSource();
        List<String> whereClauses = new ArrayList<>();
        parameters.addValue("post_id", postId);
        whereClauses.add("p.id = :post_id");

        if (!isAdmin) {
            whereClauses.add(buildVisibilityClause(viewerId, parameters));
            whereClauses.add("p.status not in ('hidden', 'removed')");
        }

        StringBuilder sql = new StringBuilder(baseSelect(false, false, true));
        appendWhere(sql, whereClauses);
        return new SqlFragments(sql.toString(), parameters);
    }

    private String baseSelect(boolean includeSearchRank, boolean includeDistance, boolean includeAiSummary) {
        StringBuilder sql = new StringBuilder("""
                select
                  p.id,
                  p.founder_id,
                  p.recruitment_type,
                  p.entry_mode,
                  p.title,
                  p.service_summary,
                  p.target_description,
                  p.participant_requirements::text as participant_requirements,
                  p.reward_amount,
                  p.compensations::text as compensations,
                  p.duration_minutes,
                  p.duration_value,
                  p.duration_unit,
                  p.recruit_count,
                  p.recruitment_limit_mode,
                  p.external_provider,
                  p.external_url,
                  p.participation_deadline_at,
                  p.external_data_notice,
                  p.beta_test_platforms,
                  p.beta_test_starts_at,
                  p.beta_test_ends_at,
                  p.beta_test_environment,
                  p.beta_test_workflow_note,
                  p.interview_mode,
                  p.location,
                  p.location_text,
                  p.location_address,
                  p.location_place_name,
                  p.location_latitude,
                  p.location_longitude,
                  p.location_precision,
                  p.location_source,
                  p.schedule_options,
                  p.schedule_mode,
                  p.schedule_fixed_slots::text as schedule_fixed_slots,
                  p.schedule_recurring_windows::text as schedule_recurring_windows,
                  p.schedule_note,
                  p.status,
                  p.created_at,
                  u.id as founder_user_id,
                  u.name as founder_name,
                  u.bio as founder_bio,
                  u.role as founder_role,
                  u.profile_image_url as founder_profile_image_url,
                  u.organization_type as founder_organization_type,
                  u.organization_name as founder_organization_name,
                  review.average_rating as founder_average_rating,
                  coalesce(review.review_count, 0) as founder_review_count,
                  review.latest_reviewed_at
                """);

        if (includeDistance) {
            sql.append("""
                    ,
                      extensions.ST_Distance(
                        p.location_point,
                        extensions.ST_SetSRID(extensions.ST_MakePoint(:lng, :lat), 4326)::extensions.geography
                      ) as distance_meters
                    """);
        } else {
            sql.append(", null::double precision as distance_meters");
        }

        if (includeSearchRank) {
            sql.append("""
                    ,
                      case
                        when lower(p.title) = :search_exact_query then 100
                        when p.title ilike :search_prefix_pattern escape '\\' then 90
                        when p.title ilike :search_contains_pattern escape '\\' then 80
                        when p.target_description ilike :search_contains_pattern escape '\\' then 60
                        when p.service_summary ilike :search_contains_pattern escape '\\' then 50
                        when concat_ws(
                          ' ',
                          coalesce(p.location, ''),
                          coalesce(p.location_text, ''),
                          coalesce(p.location_address, ''),
                          coalesce(p.location_place_name, '')
                        ) ilike :search_contains_pattern escape '\\' then 40
                        else 10
                      end as search_rank
                    """);
        }

        if (includeAiSummary) {
            sql.append("""
                    ,
                      summary.status as ai_summary_status,
                      summary.result::text as ai_summary_result,
                      summary.updated_at as ai_summary_updated_at
                    """);
        }

        sql.append("""

                from interview_posts p
                left join app_users u on u.id = p.founder_id
                left join (
                  select
                    reviewee_id,
                    round(avg(rating)::numeric, 1) as average_rating,
                    count(id) as review_count,
                    max(created_at) as latest_reviewed_at
                  from interview_reviews
                  where reviewer_role = 'respondent'
                    and visibility not in ('hidden', 'removed')
                  group by reviewee_id
                ) review on review.reviewee_id = p.founder_id
                """);
        if (includeAiSummary) {
            sql.append("""
                    left join ai_summary_artifacts summary
                      on summary.interview_post_id = p.id
                     and summary.summary_type = 'interview_post'
                    """);
        }
        return sql.toString();
    }

    private String buildVisibilityClause(UUID viewerId, MapSqlParameterSource parameters) {
        if (viewerId == null) {
            return "p.status = 'open'";
        }
        parameters.addValue("viewer_id", viewerId);
        return """
                (
                  p.status = 'open'
                  or p.founder_id = :viewer_id
                  or exists (
                    select 1
                    from applications a
                    where a.interview_post_id = p.id
                      and a.respondent_id = :viewer_id
                      and a.moderation_status = 'visible'
                  )
                )
                """;
    }

    private String buildSearchMatchClause(String normalizedQuery, MapSqlParameterSource parameters) {
        parameters.addValue("search_exact_query", normalizedQuery.toLowerCase());
        parameters.addValue("search_prefix_pattern", escapeLike(normalizedQuery) + "%");
        parameters.addValue("search_contains_pattern", "%" + escapeLike(normalizedQuery) + "%");

        List<String> terms = searchTerms(normalizedQuery);
        List<String> clauses = new ArrayList<>();
        for (int index = 0; index < terms.size(); index++) {
            String parameterName = "search_term_" + index;
            parameters.addValue(parameterName, "%" + escapeLike(terms.get(index)) + "%");
            clauses.add("lower(concat_ws(' ', coalesce(p.title, ''), coalesce(p.service_summary, ''), coalesce(p.target_description, ''), coalesce(p.location, ''), coalesce(p.location_text, ''), coalesce(p.location_address, ''), coalesce(p.location_place_name, ''))) like :" + parameterName + " escape '\\'");
        }
        return "(" + String.join(" and ", clauses) + ")";
    }

    private String distanceWithinClause() {
        return """
                extensions.ST_DWithin(
                  p.location_point,
                  extensions.ST_SetSRID(extensions.ST_MakePoint(:lng, :lat), 4326)::extensions.geography,
                  :radius_m
                )
                """;
    }

    private String orderByClause(String sort, boolean includeSearchRank, boolean includeDistance) {
        List<String> orderBy = new ArrayList<>();
        if (includeSearchRank) {
            orderBy.add("search_rank desc");
        }

        if ("distance".equals(sort) && includeDistance) {
            orderBy.add("distance_meters asc");
            orderBy.add("p.created_at desc");
        } else if ("reward".equals(sort)) {
            orderBy.add("p.reward_amount desc");
            orderBy.add("p.created_at desc");
        } else {
            orderBy.add("p.created_at desc");
        }

        return " order by " + String.join(", ", orderBy);
    }

    private void appendWhere(StringBuilder sql, List<String> whereClauses) {
        if (!whereClauses.isEmpty()) {
            sql.append(" where ").append(String.join(" and ", whereClauses));
        }
    }

    private String normalizeQuery(String query) {
        if (query == null) {
            return null;
        }
        String normalized = query.trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }

    private List<String> searchTerms(String normalizedQuery) {
        String[] tokens = normalizedQuery.toLowerCase().split(" ");
        List<String> terms = new ArrayList<>();
        for (String token : tokens) {
            if (!token.isBlank()) {
                terms.add(token);
            }
        }
        return terms;
    }

    private String escapeLike(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    private RowMapper<InterviewPostReadModel> interviewPostRowMapper(boolean includeAiSummary) {
        return (resultSet, rowNum) -> new InterviewPostReadModel(
                readUuid(resultSet, "id"),
                readUuid(resultSet, "founder_id"),
                resultSet.getString("recruitment_type"),
                resultSet.getString("entry_mode"),
                resultSet.getString("title"),
                resultSet.getString("service_summary"),
                resultSet.getString("target_description"),
                resultSet.getInt("reward_amount"),
                readCompensations(resultSet.getString("compensations"), resultSet.getInt("reward_amount")),
                resultSet.getInt("duration_minutes"),
                resultSet.getInt("recruit_count"),
                resultSet.getString("external_provider"),
                resultSet.getString("external_url"),
                toOffsetDateTime(resultSet.getTimestamp("participation_deadline_at")),
                resultSet.getString("external_data_notice"),
                readTextArray(resultSet, "beta_test_platforms"),
                toOffsetDateTime(resultSet.getTimestamp("beta_test_starts_at")),
                toOffsetDateTime(resultSet.getTimestamp("beta_test_ends_at")),
                resultSet.getString("interview_mode"),
                resultSet.getString("location"),
                resultSet.getString("location_text"),
                resultSet.getString("location_address"),
                resultSet.getString("location_place_name"),
                toDouble(resultSet.getBigDecimal("location_latitude")),
                toDouble(resultSet.getBigDecimal("location_longitude")),
                resultSet.getString("location_precision"),
                resultSet.getString("location_source"),
                readScheduleOptions(resultSet.getString("schedule_options")),
                resultSet.getString("status"),
                toOffsetDateTime(resultSet.getTimestamp("created_at")),
                readFounderSummary(resultSet),
                readFounderReviewSummary(resultSet),
                readNullableDouble(resultSet, "distance_meters"),
                includeAiSummary ? readInterviewAiSummary(resultSet) : null,
                readScheduleOptions(resultSet.getString("participant_requirements")),
                new PostingCreationConfiguration(
                        getNullableInt(resultSet, "duration_value"),
                        resultSet.getString("duration_unit"),
                        resultSet.getString("schedule_mode"),
                        readScheduleOptions(resultSet.getString("schedule_fixed_slots")),
                        readScheduleOptions(resultSet.getString("schedule_recurring_windows")),
                        resultSet.getString("schedule_note"),
                        resultSet.getString("recruitment_limit_mode"),
                        resultSet.getString("beta_test_environment"),
                        resultSet.getString("beta_test_workflow_note")
                )
        );
    }

    private Integer getNullableInt(ResultSet resultSet, String column) throws SQLException {
        int value = resultSet.getInt(column);
        return resultSet.wasNull() ? null : value;
    }

    private InterviewAiSummaryReadModel readInterviewAiSummary(ResultSet resultSet) throws SQLException {
        String status = resultSet.getString("ai_summary_status");
        if (status == null || status.isBlank()) {
            return null;
        }
        return new InterviewAiSummaryReadModel(
                status,
                "ready".equals(status) ? readSummaryContent(resultSet.getString("ai_summary_result")) : null,
                toOffsetDateTime(resultSet.getTimestamp("ai_summary_updated_at"))
        );
    }

    private List<PostingCompensation> readCompensations(String rawJson, int legacyRewardAmount) {
        if (rawJson == null || rawJson.isBlank()) {
            return PostingCompensations.legacy(legacyRewardAmount);
        }
        try {
            List<PostingCompensation> values = objectMapper.readValue(rawJson, COMPENSATION_LIST_TYPE);
            return values == null || values.isEmpty() ? PostingCompensations.legacy(legacyRewardAmount) : List.copyOf(values);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to parse posting compensations JSON", exception);
        }
    }

    private InterviewSummaryContentModel readSummaryContent(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(rawJson, INTERVIEW_SUMMARY_CONTENT_TYPE);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to parse interview ai_summary JSON", exception);
        }
    }

    private FounderSummary readFounderSummary(ResultSet resultSet) throws SQLException {
        UUID founderUserId = readUuid(resultSet, "founder_user_id");
        if (founderUserId == null) {
            return null;
        }
        return new FounderSummary(
                founderUserId,
                resultSet.getString("founder_name"),
                resultSet.getString("founder_bio"),
                resultSet.getString("founder_role"),
                resultSet.getString("founder_profile_image_url"),
                resultSet.getString("founder_organization_type"),
                resultSet.getString("founder_organization_name")
        );
    }

    private FounderReviewSummary readFounderReviewSummary(ResultSet resultSet) throws SQLException {
        double averageRatingRaw = resultSet.getDouble("founder_average_rating");
        Double averageRating = resultSet.wasNull() ? null : averageRatingRaw;
        return new FounderReviewSummary(
                averageRating,
                resultSet.getInt("founder_review_count"),
                toOffsetDateTime(resultSet.getTimestamp("latest_reviewed_at"))
        );
    }

    private List<String> readScheduleOptions(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(rawJson, STRING_LIST_TYPE);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to parse schedule_options JSON", exception);
        }
    }

    private List<String> readTextArray(ResultSet resultSet, String columnName) throws SQLException {
        java.sql.Array array = resultSet.getArray(columnName);
        if (array == null) {
            return List.of();
        }
        Object raw = array.getArray();
        if (!(raw instanceof Object[] values) || values.length == 0) {
            return List.of();
        }
        List<String> result = new ArrayList<>(values.length);
        for (Object value : values) {
            if (value != null) {
                result.add(String.valueOf(value));
            }
        }
        return List.copyOf(result);
    }

    private UUID readUuid(ResultSet resultSet, String columnName) throws SQLException {
        Object value = resultSet.getObject(columnName);
        if (value == null) {
            return null;
        }
        if (value instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(String.valueOf(value));
    }

    private Double readNullableDouble(ResultSet resultSet, String columnName) throws SQLException {
        double value = resultSet.getDouble(columnName);
        return resultSet.wasNull() ? null : value;
    }

    private Double toDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }

    private OffsetDateTime toOffsetDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant().atOffset(ZoneOffset.UTC);
    }

    private record SqlFragments(String sql, MapSqlParameterSource parameters) {
    }
}
