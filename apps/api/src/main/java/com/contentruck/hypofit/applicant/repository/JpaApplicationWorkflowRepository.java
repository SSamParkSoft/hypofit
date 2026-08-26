package com.contentruck.hypofit.applicant.repository;

import com.contentruck.hypofit.applicant.entity.ApplicationRecordEntity;
import com.contentruck.hypofit.applicant.entity.InterviewPostRecordEntity;
import com.contentruck.hypofit.applicant.entity.UserRecordEntity;
import com.contentruck.hypofit.applicant.service.ApplicationReadModel;
import com.contentruck.hypofit.applicant.service.ApplicationRespondentSummary;
import com.contentruck.hypofit.applicant.service.ApplicationUserAccount;
import com.contentruck.hypofit.applicant.service.ApplicationWorkflowContext;
import com.contentruck.hypofit.applicant.service.ApplicantAiSummaryReadModel;
import com.contentruck.hypofit.applicant.service.ApplicantSummaryContentModel;
import com.contentruck.hypofit.applicant.service.InterviewPostOwnership;
import com.contentruck.hypofit.applicant.service.ApplicationWorkflowRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JpaApplicationWorkflowRepository implements ApplicationWorkflowRepository {

    private static final String VISIBLE = "visible";
    private static final TypeReference<Map<String, String>> STRING_MAP_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<ApplicantSummaryContentModel> APPLICANT_SUMMARY_CONTENT_TYPE = new TypeReference<>() {
    };

    private final EntityManager entityManager;
    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public JpaApplicationWorkflowRepository(
            EntityManager entityManager,
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<ApplicationUserAccount> findUserAccount(UUID userId) {
        UserRecordEntity entity = entityManager.find(UserRecordEntity.class, userId);
        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(new ApplicationUserAccount(
                entity.getId(),
                entity.getEmail(),
                entity.getRole(),
                entity.getDeletedAt() != null,
                entity.getDeactivatedAt() != null
        ));
    }

    @Override
    public List<ApplicationReadModel> listVisibleApplicationsForUser(UUID userId) {
        List<ApplicationRecordEntity> applications = entityManager.createQuery(
                        """
                        select a
                        from ApplicationRecordEntity a
                        join InterviewPostRecordEntity p on p.id = a.interviewPostId
                        where a.moderationStatus = :visible
                          and (a.respondentId = :userId or p.founderId = :userId)
                        order by a.createdAt desc
                        """,
                        ApplicationRecordEntity.class
                )
                .setParameter("visible", VISIBLE)
                .setParameter("userId", userId)
                .setMaxResults(100)
                .getResultList();

        if (applications.isEmpty()) {
            return List.of();
        }

        Set<UUID> respondentIds = applications.stream()
                .map(ApplicationRecordEntity::getRespondentId)
                .collect(java.util.stream.Collectors.toSet());

        Map<UUID, ApplicationRespondentSummary> respondents = new LinkedHashMap<>();
        entityManager.createQuery(
                        """
                        select u
                        from UserRecordEntity u
                        where u.id in :userIds
                        """,
                        UserRecordEntity.class
                )
                .setParameter("userIds", respondentIds)
                .getResultList()
                .forEach(user -> respondents.put(user.getId(), new ApplicationRespondentSummary(
                        user.getId(),
                        user.getName(),
                        user.getBio(),
                        user.getRole(),
                        user.getProfileImageUrl()
                )));

        List<ApplicationReadModel> result = new ArrayList<>();
        for (ApplicationRecordEntity application : applications) {
            result.add(toReadModel(application, respondents.get(application.getRespondentId())));
        }
        return result;
    }

    @Override
    public Optional<ApplicationReadModel> findVisibleApplicationDetail(UUID applicationId, UUID viewerId) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("application_id", applicationId)
                .addValue("viewer_id", viewerId);
        List<ApplicationReadModel> details = jdbcTemplate.query(
                """
                select
                  a.id,
                  a.interview_post_id,
                  a.answers::text as answers_json,
                  a.available_times::text as available_times_json,
                  a.respondent_id,
                  a.status,
                  a.rejection_reason,
                  u.id as respondent_user_id,
                  u.name as respondent_name,
                  u.bio as respondent_bio,
                  u.role as respondent_role,
                  u.profile_image_url as respondent_profile_image_url,
                  case when p.founder_id = :viewer_id then summary.status else null end as ai_summary_status,
                  case when p.founder_id = :viewer_id then summary.result::text else null end as ai_summary_result,
                  case when p.founder_id = :viewer_id then summary.updated_at else null end as ai_summary_updated_at
                from applications a
                join interview_posts p on p.id = a.interview_post_id
                left join app_users u on u.id = a.respondent_id
                left join ai_summary_artifacts summary
                  on summary.application_id = a.id
                 and summary.summary_type = 'application'
                where a.id = :application_id
                  and a.moderation_status = :visible
                  and (a.respondent_id = :viewer_id or p.founder_id = :viewer_id)
                """,
                parameters.addValue("visible", VISIBLE),
                (resultSet, rowNum) -> new ApplicationReadModel(
                        readUuid(resultSet.getObject("id")),
                        readUuid(resultSet.getObject("interview_post_id")),
                        readAnswers(resultSet.getString("answers_json")),
                        readAvailableTimes(resultSet.getString("available_times_json")),
                        readUuid(resultSet.getObject("respondent_id")),
                        resultSet.getString("status"),
                        resultSet.getString("rejection_reason"),
                        readRespondent(resultSet),
                        readApplicantAiSummary(resultSet.getString("ai_summary_status"), resultSet.getString("ai_summary_result"), resultSet.getTimestamp("ai_summary_updated_at"))
                )
        );
        return details.stream().findFirst();
    }

    @Override
    public Optional<InterviewPostOwnership> findInterviewPost(UUID interviewPostId) {
        InterviewPostRecordEntity entity = entityManager.find(InterviewPostRecordEntity.class, interviewPostId);
        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(new InterviewPostOwnership(
                entity.getId(),
                entity.getFounderId(),
                entity.getTitle(),
                entity.getRecruitmentType()
        ));
    }

    @Override
    public boolean hasActiveBlockBetween(UUID userAId, UUID userBId) {
        Long count = entityManager.createQuery(
                        """
                        select count(b)
                        from UserBlockRecordEntity b
                        where b.revokedAt is null
                          and ((b.blockerId = :userAId and b.blockedUserId = :userBId)
                               or (b.blockerId = :userBId and b.blockedUserId = :userAId))
                        """,
                        Long.class
                )
                .setParameter("userAId", userAId)
                .setParameter("userBId", userBId)
                .getSingleResult();
        return count != null && count > 0;
    }

    @Override
    public boolean existsApplicationForPostAndRespondent(UUID interviewPostId, UUID respondentId) {
        Long count = entityManager.createQuery(
                        """
                        select count(a)
                        from ApplicationRecordEntity a
                        where a.interviewPostId = :interviewPostId
                          and a.respondentId = :respondentId
                        """,
                        Long.class
                )
                .setParameter("interviewPostId", interviewPostId)
                .setParameter("respondentId", respondentId)
                .getSingleResult();
        return count != null && count > 0;
    }

    @Override
    public ApplicationReadModel createApplication(
            UUID interviewPostId,
            UUID respondentId,
            Map<String, String> answers,
            List<String> availableTimes
    ) {
        ApplicationRecordEntity entity = new ApplicationRecordEntity(
                UUID.randomUUID(),
                interviewPostId,
                respondentId,
                new LinkedHashMap<>(answers),
                new ArrayList<>(availableTimes),
                "applied",
                VISIBLE,
                null
        );
        entityManager.persist(entity);
        entityManager.flush();
        return requireVisibleReadModel(entity.getId());
    }

    @Override
    public Optional<ApplicationWorkflowContext> findVisibleApplicationContext(UUID applicationId) {
        return findApplicationContext(applicationId, false);
    }

    @Override
    public Optional<ApplicationWorkflowContext> lockVisibleApplicationContext(UUID applicationId) {
        return findApplicationContext(applicationId, true);
    }

    @Override
    public boolean hasScheduledVisibleSession(UUID applicationId) {
        Long count = entityManager.createQuery(
                        """
                        select count(s)
                        from InterviewSessionRecordEntity s
                        where s.applicationId = :applicationId
                          and s.status = 'scheduled'
                          and s.moderationStatus = :visible
                        """,
                        Long.class
                )
                .setParameter("applicationId", applicationId)
                .setParameter("visible", VISIBLE)
                .getSingleResult();
        return count != null && count > 0;
    }

    @Override
    public Optional<ApplicationReadModel> updateStatusIfCurrent(
            UUID applicationId,
            String nextStatus,
            Set<String> allowedStatuses,
            String rejectionReason
    ) {
        int updatedCount = entityManager.createQuery(
                        """
                        update ApplicationRecordEntity a
                        set a.status = :nextStatus,
                            a.rejectionReason = :rejectionReason
                        where a.id = :applicationId
                          and a.moderationStatus = :visible
                          and a.status in :allowedStatuses
                        """
                )
                .setParameter("nextStatus", nextStatus)
                .setParameter("rejectionReason", "rejected".equals(nextStatus) ? rejectionReason : null)
                .setParameter("applicationId", applicationId)
                .setParameter("visible", VISIBLE)
                .setParameter("allowedStatuses", allowedStatuses)
                .executeUpdate();
        entityManager.flush();
        entityManager.clear();
        if (updatedCount == 0) {
            return Optional.empty();
        }
        return Optional.of(requireVisibleReadModel(applicationId));
    }

    private Optional<ApplicationWorkflowContext> findApplicationContext(UUID applicationId, boolean lock) {
        List<Object[]> rows = entityManager.createQuery(
                        """
                        select a, p
                        from ApplicationRecordEntity a
                        join InterviewPostRecordEntity p on p.id = a.interviewPostId
                        where a.id = :applicationId
                          and a.moderationStatus = :visible
                        """,
                        Object[].class
                )
                .setParameter("applicationId", applicationId)
                .setParameter("visible", VISIBLE)
                .setLockMode(lock ? LockModeType.PESSIMISTIC_WRITE : LockModeType.NONE)
                .getResultList();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        ApplicationRecordEntity application = (ApplicationRecordEntity) rows.getFirst()[0];
        InterviewPostRecordEntity post = (InterviewPostRecordEntity) rows.getFirst()[1];
        return Optional.of(new ApplicationWorkflowContext(
                application.getId(),
                application.getInterviewPostId(),
                post.getTitle(),
                post.getRecruitmentType(),
                post.getFounderId(),
                application.getRespondentId(),
                copyAnswers(application.getAnswers()),
                copyAvailableTimes(application.getAvailableTimes()),
                application.getStatus(),
                application.getRejectionReason()
        ));
    }

    private ApplicationReadModel requireVisibleReadModel(UUID applicationId) {
        List<Object[]> rows = entityManager.createQuery(
                        """
                        select a, u
                        from ApplicationRecordEntity a
                        left join UserRecordEntity u on u.id = a.respondentId
                        where a.id = :applicationId
                          and a.moderationStatus = :visible
                        """,
                        Object[].class
                )
                .setParameter("applicationId", applicationId)
                .setParameter("visible", VISIBLE)
                .getResultList();
        if (rows.isEmpty()) {
            throw new IllegalStateException("Expected application to exist after write");
        }
        ApplicationRecordEntity application = (ApplicationRecordEntity) rows.getFirst()[0];
        return toReadModel(application, null);
    }

    private ApplicationReadModel toReadModel(
            ApplicationRecordEntity entity,
            ApplicationRespondentSummary respondent
    ) {
        return new ApplicationReadModel(
                entity.getId(),
                entity.getInterviewPostId(),
                copyAnswers(entity.getAnswers()),
                copyAvailableTimes(entity.getAvailableTimes()),
                entity.getRespondentId(),
                entity.getStatus(),
                entity.getRejectionReason(),
                respondent
        );
    }

    private ApplicantAiSummaryReadModel readApplicantAiSummary(
            String status,
            String rawJson,
            Timestamp updatedAt
    ) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return new ApplicantAiSummaryReadModel(
                status,
                "ready".equals(status) ? readApplicantSummaryContent(rawJson) : null,
                toOffsetDateTime(updatedAt)
        );
    }

    private ApplicantSummaryContentModel readApplicantSummaryContent(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(rawJson, APPLICANT_SUMMARY_CONTENT_TYPE);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to parse application ai_summary JSON", exception);
        }
    }

    private ApplicationRespondentSummary readRespondent(java.sql.ResultSet resultSet) throws java.sql.SQLException {
        UUID respondentUserId = readUuid(resultSet.getObject("respondent_user_id"));
        if (respondentUserId == null) {
            return null;
        }
        return new ApplicationRespondentSummary(
                respondentUserId,
                resultSet.getString("respondent_name"),
                resultSet.getString("respondent_bio"),
                resultSet.getString("respondent_role"),
                resultSet.getString("respondent_profile_image_url")
        );
    }

    private Map<String, String> readAnswers(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(rawJson, STRING_MAP_TYPE);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to parse application answers JSON", exception);
        }
    }

    private List<String> readAvailableTimes(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(rawJson, STRING_LIST_TYPE);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to parse application available_times JSON", exception);
        }
    }

    private UUID readUuid(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(String.valueOf(value));
    }

    private OffsetDateTime toOffsetDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant().atOffset(ZoneOffset.UTC);
    }

    private Map<String, String> copyAnswers(Map<String, String> answers) {
        return answers == null ? Map.of() : new LinkedHashMap<>(answers);
    }

    private List<String> copyAvailableTimes(List<String> availableTimes) {
        return availableTimes == null ? List.of() : List.copyOf(availableTimes);
    }
}
