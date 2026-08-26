package com.contentruck.hypofit.ai.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAiSummaryArtifactRepository implements AiSummaryArtifactRepository {

    private static final String PROCESSING_LEASE_EXPIRED = "processing_lease_expired";
    private static final TypeReference<List<Object>> OBJECT_LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<Map<String, Object>> OBJECT_MAP_TYPE = new TypeReference<>() {
    };

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public JdbcAiSummaryArtifactRepository(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public UpsertResult upsertInterviewPostPendingWork(PendingWorkUpsert command) {
        return upsertPendingWork(command, SummaryType.INTERVIEW_POST);
    }

    @Override
    public UpsertResult upsertApplicationPendingWork(PendingWorkUpsert command) {
        return upsertPendingWork(command, SummaryType.APPLICATION);
    }

    @Override
    public StaleProcessingResetResult resetStaleProcessingArtifacts(OffsetDateTime now, int timeoutSeconds, int maxAttempts) {
        Map<String, Object> parameters = Map.of(
                "now", now,
                "timeoutSeconds", timeoutSeconds,
                "maxAttempts", maxAttempts,
                "failureCode", PROCESSING_LEASE_EXPIRED
        );
        int resetToPendingCount = jdbcTemplate.update("""
                        update ai_summary_artifacts
                        set status = 'pending',
                            result = null,
                            next_attempt_at = :now,
                            last_error_code = null,
                            last_error_message = null,
                            started_at = null,
                            completed_at = null,
                            updated_at = :now
                        where status = 'processing'
                          and coalesce(started_at, updated_at) <= (:now - make_interval(secs => :timeoutSeconds))
                          and attempt_count < :maxAttempts
                        """, parameters);
        int markedFailedCount = jdbcTemplate.update("""
                        update ai_summary_artifacts
                        set status = 'failed',
                            result = null,
                            next_attempt_at = :now,
                            last_error_code = coalesce(last_error_code, :failureCode),
                            last_error_message = null,
                            started_at = null,
                            completed_at = :now,
                            updated_at = :now
                        where status = 'processing'
                          and coalesce(started_at, updated_at) <= (:now - make_interval(secs => :timeoutSeconds))
                          and attempt_count >= :maxAttempts
                        """, parameters);
        return new StaleProcessingResetResult(resetToPendingCount, markedFailedCount);
    }

    @Override
    public List<ClaimedArtifact> claimPendingArtifacts(OffsetDateTime now, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        return jdbcTemplate.query("""
                        with candidate as (
                          select artifact.id
                          from ai_summary_artifacts artifact
                          where artifact.status = 'pending'
                            and artifact.next_attempt_at <= :now
                          order by artifact.next_attempt_at asc, artifact.created_at asc
                          limit :limit
                          for update skip locked
                        )
                        update ai_summary_artifacts artifact
                        set status = 'processing',
                            attempt_count = artifact.attempt_count + 1,
                            started_at = :now,
                            completed_at = null,
                            updated_at = :now
                        from candidate
                        where artifact.id = candidate.id
                        returning
                          artifact.id,
                          artifact.summary_type,
                          artifact.interview_post_id,
                          artifact.application_id,
                          artifact.source_hash,
                          artifact.prompt_version,
                          artifact.work_version,
                          artifact.attempt_count
                        """, Map.of(
                        "now", now,
                        "limit", limit
                ), claimedArtifactRowMapper());
    }

    @Override
    public Optional<InterviewSummarySource> loadInterviewPostSource(UUID interviewPostId) {
        List<InterviewSummarySource> rows = jdbcTemplate.query("""
                        select
                          p.id,
                          p.title,
                          p.service_summary,
                          p.target_description,
                          p.reward_amount,
                          p.duration_minutes,
                          p.recruit_count,
                          p.interview_mode,
                          case
                            when p.location_precision = 'exact' then coalesce(
                              nullif(btrim(p.location_address), ''),
                              nullif(btrim(p.location_place_name), ''),
                              nullif(btrim(p.location_text), ''),
                              nullif(btrim(p.location), '')
                            )
                            when p.location_precision in ('nearby', 'district') then coalesce(
                              nullif(btrim(p.location_text), ''),
                              nullif(btrim(p.location_place_name), ''),
                              nullif(btrim(p.location), ''),
                              nullif(btrim(p.location_address), '')
                            )
                            else coalesce(
                              nullif(btrim(p.location_text), ''),
                              nullif(btrim(p.location_place_name), ''),
                              nullif(btrim(p.location_address), ''),
                              nullif(btrim(p.location), '')
                            )
                          end as public_location_text,
                          p.schedule_options::text as schedule_options_json
                        from interview_posts p
                        where p.id = :interviewPostId
                          and p.recruitment_type = 'interview'
                          and p.status not in ('draft', 'hidden', 'removed')
                        """, Map.of("interviewPostId", interviewPostId), (resultSet, rowNum) -> new InterviewSummarySource(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("title"),
                        resultSet.getString("service_summary"),
                        resultSet.getString("target_description"),
                        resultSet.getInt("reward_amount"),
                        resultSet.getInt("duration_minutes"),
                        resultSet.getInt("recruit_count"),
                        resultSet.getString("interview_mode"),
                        resultSet.getString("public_location_text"),
                        readStringList(resultSet.getString("schedule_options_json"))
                ));
        return rows.stream().findFirst();
    }

    @Override
    public Optional<ApplicationSummarySource> loadApplicationSource(UUID applicationId) {
        List<ApplicationSummarySource> rows = jdbcTemplate.query("""
                        select
                          a.id,
                          a.interview_post_id,
                          p.title as interview_title,
                          p.target_description,
                          a.answers::text as answers_json,
                          a.available_times::text as available_times_json
                        from applications a
                        join interview_posts p on p.id = a.interview_post_id
                        where a.id = :applicationId
                          and a.moderation_status = 'visible'
                          and p.recruitment_type = 'interview'
                          and p.status not in ('draft', 'hidden', 'removed')
                        """, Map.of("applicationId", applicationId), (resultSet, rowNum) -> new ApplicationSummarySource(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("interview_post_id", UUID.class),
                        resultSet.getString("interview_title"),
                        resultSet.getString("target_description"),
                        readStringMap(resultSet.getString("answers_json")),
                        readStringList(resultSet.getString("available_times_json"))
                ));
        return rows.stream().findFirst();
    }

    @Override
    public GuardedCompletionResult markReady(ReadyArtifactCompletion command) {
        boolean updated = updateArtifact("""
                update ai_summary_artifacts
                set status = 'ready',
                    result = cast(:resultJson as jsonb),
                    provider = :provider,
                    model = :model,
                    input_tokens = :inputTokens,
                    output_tokens = :outputTokens,
                    estimated_cost_usd = :estimatedCostUsd,
                    next_attempt_at = :now,
                    last_error_code = null,
                    last_error_message = null,
                    started_at = null,
                    completed_at = :now,
                    updated_at = :now
                where id = :artifactId
                  and status = 'processing'
                  and source_hash = :sourceHash
                  and prompt_version = :promptVersion
                  and work_version = :workVersion
                """, new MapSqlParameterSource()
                .addValue("artifactId", command.artifactId())
                .addValue("sourceHash", command.sourceHash())
                .addValue("promptVersion", command.promptVersion())
                .addValue("workVersion", command.workVersion())
                .addValue("now", command.now())
                .addValue("provider", command.provider())
                .addValue("model", command.model())
                .addValue("resultJson", command.resultJson())
                .addValue("inputTokens", command.inputTokens())
                .addValue("outputTokens", command.outputTokens())
                .addValue("estimatedCostUsd", command.estimatedCostUsd()));
        return updated ? GuardedCompletionResult.APPLIED : GuardedCompletionResult.STALE;
    }

    @Override
    public RetryableFailureResult markRetryableFailure(RetryableArtifactFailure command) {
        List<String> statuses = jdbcTemplate.query("""
                update ai_summary_artifacts
                set status = case
                      when attempt_count >= :maxAttempts then 'failed'
                      else 'pending'
                    end,
                    result = null,
                    next_attempt_at = case
                      when attempt_count >= :maxAttempts then :now
                      else :nextAttemptAt
                    end,
                    last_error_code = :failureCode,
                    last_error_message = null,
                    provider = :provider,
                    model = :model,
                    started_at = null,
                    completed_at = case
                      when attempt_count >= :maxAttempts then :now
                      else null
                    end,
                    updated_at = :now
                where id = :artifactId
                  and status = 'processing'
                  and source_hash = :sourceHash
                  and prompt_version = :promptVersion
                  and work_version = :workVersion
                returning status
                """, new MapSqlParameterSource()
                .addValue("artifactId", command.artifactId())
                .addValue("sourceHash", command.sourceHash())
                .addValue("promptVersion", command.promptVersion())
                .addValue("workVersion", command.workVersion())
                .addValue("now", command.now())
                .addValue("nextAttemptAt", command.nextAttemptAt())
                .addValue("failureCode", command.failureCode())
                .addValue("provider", command.provider())
                .addValue("model", command.model())
                .addValue("maxAttempts", command.maxAttempts()),
                (resultSet, rowNum) -> resultSet.getString("status"));
        if (statuses.isEmpty()) {
            return RetryableFailureResult.STALE;
        }
        return "failed".equals(statuses.getFirst())
                ? RetryableFailureResult.MARKED_FAILED
                : RetryableFailureResult.RETRY_SCHEDULED;
    }

    @Override
    public GuardedCompletionResult markFailed(FailedArtifactCompletion command) {
        boolean updated = updateArtifact("""
                update ai_summary_artifacts
                set status = 'failed',
                    result = null,
                    next_attempt_at = :now,
                    last_error_code = :failureCode,
                    last_error_message = null,
                    provider = :provider,
                    model = :model,
                    started_at = null,
                    completed_at = :now,
                    updated_at = :now
                where id = :artifactId
                  and status = 'processing'
                  and source_hash = :sourceHash
                  and prompt_version = :promptVersion
                  and work_version = :workVersion
                """, new MapSqlParameterSource()
                .addValue("artifactId", command.artifactId())
                .addValue("sourceHash", command.sourceHash())
                .addValue("promptVersion", command.promptVersion())
                .addValue("workVersion", command.workVersion())
                .addValue("now", command.now())
                .addValue("failureCode", command.failureCode())
                .addValue("provider", command.provider())
                .addValue("model", command.model()));
        return updated ? GuardedCompletionResult.APPLIED : GuardedCompletionResult.STALE;
    }

    private UpsertResult upsertPendingWork(PendingWorkUpsert command, SummaryType summaryType) {
        List<UpsertResult> changedRows = jdbcTemplate.query(
                upsertSql(summaryType),
                new MapSqlParameterSource()
                        .addValue("summaryType", summaryType.databaseValue())
                        .addValue("targetId", command.targetId())
                        .addValue("sourceHash", command.sourceHash())
                        .addValue("promptVersion", command.promptVersion())
                        .addValue("now", command.now()),
                upsertResultRowMapper(true)
        );
        if (!changedRows.isEmpty()) {
            return changedRows.getFirst();
        }

        List<UpsertResult> currentRows = jdbcTemplate.query(
                selectCurrentSql(summaryType),
                new MapSqlParameterSource()
                        .addValue("targetId", command.targetId())
                        .addValue("summaryType", summaryType.databaseValue()),
                upsertResultRowMapper(false)
        );
        if (currentRows.isEmpty()) {
            throw new IllegalStateException("Expected ai_summary_artifacts row to exist after upsert");
        }
        return currentRows.getFirst();
    }

    private String upsertSql(SummaryType summaryType) {
        String targetColumn = summaryType == SummaryType.INTERVIEW_POST ? "interview_post_id" : "application_id";
        return """
                insert into ai_summary_artifacts (
                  id,
                  summary_type,
                  %s,
                  status,
                  source_hash,
                  prompt_version,
                  work_version,
                  result,
                  attempt_count,
                  next_attempt_at,
                  last_error_code,
                  last_error_message,
                  provider,
                  model,
                  input_tokens,
                  output_tokens,
                  estimated_cost_usd,
                  started_at,
                  completed_at,
                  created_at,
                  updated_at
                ) values (
                  gen_random_uuid(),
                  :summaryType,
                  :targetId,
                  'pending',
                  :sourceHash,
                  :promptVersion,
                  1,
                  null,
                  0,
                  :now,
                  null,
                  null,
                  null,
                  null,
                  null,
                  null,
                  null,
                  null,
                  null,
                  :now,
                  :now
                )
                on conflict (%s) where %s is not null
                do update set
                  status = 'pending',
                  source_hash = excluded.source_hash,
                  prompt_version = excluded.prompt_version,
                  work_version = ai_summary_artifacts.work_version + 1,
                  result = null,
                  attempt_count = 0,
                  next_attempt_at = excluded.next_attempt_at,
                  last_error_code = null,
                  last_error_message = null,
                  provider = null,
                  model = null,
                  input_tokens = null,
                  output_tokens = null,
                  estimated_cost_usd = null,
                  started_at = null,
                  completed_at = null,
                  updated_at = excluded.updated_at
                where ai_summary_artifacts.source_hash is distinct from excluded.source_hash
                   or ai_summary_artifacts.prompt_version is distinct from excluded.prompt_version
                returning id, work_version
                """.formatted(targetColumn, targetColumn, targetColumn);
    }

    private String selectCurrentSql(SummaryType summaryType) {
        String targetColumn = summaryType == SummaryType.INTERVIEW_POST ? "interview_post_id" : "application_id";
        return """
                select id, work_version
                from ai_summary_artifacts
                where %s = :targetId
                  and summary_type = :summaryType
                """.formatted(targetColumn);
    }

    private RowMapper<UpsertResult> upsertResultRowMapper(boolean changed) {
        return (resultSet, rowNum) -> new UpsertResult(
                resultSet.getObject("id", UUID.class),
                resultSet.getInt("work_version"),
                changed
        );
    }

    private RowMapper<ClaimedArtifact> claimedArtifactRowMapper() {
        return (resultSet, rowNum) -> new ClaimedArtifact(
                resultSet.getObject("id", UUID.class),
                SummaryType.fromDatabaseValue(resultSet.getString("summary_type")),
                resultSet.getObject("interview_post_id", UUID.class),
                resultSet.getObject("application_id", UUID.class),
                resultSet.getString("source_hash"),
                resultSet.getString("prompt_version"),
                resultSet.getInt("work_version"),
                resultSet.getInt("attempt_count")
        );
    }

    private boolean updateArtifact(String sql, MapSqlParameterSource parameters) {
        return jdbcTemplate.update(sql, parameters) == 1;
    }

    private List<String> readStringList(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }
        try {
            List<Object> rawValues = objectMapper.readValue(rawJson, OBJECT_LIST_TYPE);
            if (rawValues == null || rawValues.isEmpty()) {
                return List.of();
            }
            return rawValues.stream()
                    .map(this::normalizeStringValue)
                    .filter(value -> value != null && !value.isBlank())
                    .toList();
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse ai summary source list JSON", exception);
        }
    }

    private Map<String, String> readStringMap(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, Object> rawValues = objectMapper.readValue(rawJson, OBJECT_MAP_TYPE);
            if (rawValues == null || rawValues.isEmpty()) {
                return Map.of();
            }
            Map<String, String> normalized = new LinkedHashMap<>();
            rawValues.forEach((key, value) -> {
                String normalizedKey = normalizeStringValue(key);
                String normalizedValue = normalizeStringValue(value);
                if (normalizedKey != null && !normalizedKey.isBlank()
                        && normalizedValue != null && !normalizedValue.isBlank()) {
                    normalized.put(normalizedKey, normalizedValue);
                }
            });
            return normalized.isEmpty() ? Map.of() : Map.copyOf(normalized);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse ai summary source map JSON", exception);
        }
    }

    private String normalizeStringValue(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        String text = String.valueOf(rawValue).trim();
        return text.isEmpty() ? null : text;
    }
}
