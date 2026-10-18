package com.contentruck.hypofit.survey.repository;

import com.contentruck.hypofit.survey.entity.SurveyParticipationEntity;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SurveyParticipationJpaRepository extends JpaRepository<SurveyParticipationEntity, UUID> {

    @Modifying
    @Query(value = """
            insert into survey_participations (
                id, post_id, participant_id, status, opened_at, created_at, updated_at
            ) values (
                gen_random_uuid(), :postId, :participantId, 'opened', :openedAt, now(), now()
            )
            on conflict (post_id, participant_id) do nothing
            """, nativeQuery = true)
    int insertOpenedIfAbsent(
            @Param("postId") UUID postId,
            @Param("participantId") UUID participantId,
            @Param("openedAt") java.time.OffsetDateTime openedAt
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select participation
            from SurveyParticipationEntity participation
            where participation.postId = :postId
              and participation.participantId = :participantId
            """)
    Optional<SurveyParticipationEntity> findForUpdate(
            @Param("postId") UUID postId,
            @Param("participantId") UUID participantId
    );

    Optional<SurveyParticipationEntity> findByPostIdAndParticipantId(UUID postId, UUID participantId);

    @Query(value = """
            select participation.*
            from survey_participations participation
            join interview_posts post on post.id = participation.post_id
            where participation.post_id = :postId
              and (post.entry_mode <> 'application_required' or not exists (
                select 1
                from applications application
                where application.interview_post_id = participation.post_id
                  and application.respondent_id = participation.participant_id
                  and application.sharing_withdrawn_at is not null
              ))
            order by participation.created_at desc
            """, nativeQuery = true)
    List<SurveyParticipationEntity> findAllByPostIdOrderByCreatedAtDesc(@Param("postId") UUID postId);
}
