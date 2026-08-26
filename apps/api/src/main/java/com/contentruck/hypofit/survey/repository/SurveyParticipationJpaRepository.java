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

    List<SurveyParticipationEntity> findAllByPostIdOrderByCreatedAtDesc(UUID postId);
}
