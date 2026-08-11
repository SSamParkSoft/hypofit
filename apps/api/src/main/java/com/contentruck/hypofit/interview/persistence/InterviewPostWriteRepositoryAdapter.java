package com.contentruck.hypofit.interview.persistence;

import com.contentruck.hypofit.interview.application.InterviewPostCreateCommand;
import com.contentruck.hypofit.interview.application.InterviewPostWriteRepository;
import com.contentruck.hypofit.interview.domain.InterviewPostActorAccount;
import com.contentruck.hypofit.interview.domain.InterviewPostWriteModel;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class InterviewPostWriteRepositoryAdapter implements InterviewPostWriteRepository {

    private final EntityManager entityManager;

    public InterviewPostWriteRepositoryAdapter(
            EntityManager entityManager
    ) {
        this.entityManager = entityManager;
    }

    @Override
    public Optional<InterviewPostActorAccount> findUserAccount(UUID userId) {
        InterviewUserAccountEntity entity = entityManager.find(InterviewUserAccountEntity.class, userId);
        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(new InterviewPostActorAccount(
                entity.getId(),
                entity.getEmail(),
                entity.getRole(),
                entity.getDeletedAt() != null,
                entity.getDeactivatedAt() != null
        ));
    }

    @Override
    public Optional<InterviewPostWriteModel> findPost(UUID postId) {
        InterviewPostEntity entity = entityManager.find(InterviewPostEntity.class, postId);
        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(toModel(entity));
    }

    @Override
    public InterviewPostWriteModel createPost(UUID founderId, InterviewPostCreateCommand command) {
        InterviewPostEntity entity = new InterviewPostEntity();
        entity.setFounderId(founderId);
        entity.setTitle(command.title());
        entity.setServiceSummary(command.serviceSummary());
        entity.setTargetDescription(command.targetDescription());
        entity.setRewardAmount(command.rewardAmount());
        entity.setDurationMinutes(command.durationMinutes());
        entity.setRecruitCount(command.recruitCount());
        entity.setInterviewMode(command.interviewMode());
        entity.setLocation(command.location() != null ? command.location() : command.locationText());
        entity.setLocationText(command.locationText() != null ? command.locationText() : command.location());
        entity.setLocationAddress(command.locationAddress());
        entity.setLocationPlaceName(command.locationPlaceName());
        entity.setLocationLatitude(decimal(command.locationLatitude()));
        entity.setLocationLongitude(decimal(command.locationLongitude()));
        entity.setLocationPrecision(command.locationPrecision());
        entity.setLocationSource(command.locationSource());
        entity.setScheduleOptions(command.scheduleOptions());
        entity.setStatus(command.status());
        entityManager.persist(entity);
        entityManager.flush();
        if (entity.getLocationLatitude() != null && entity.getLocationLongitude() != null) {
            syncLocationPoint(entity);
        }
        return toModel(entity);
    }

    @Override
    public InterviewPostWriteModel updatePost(UUID postId, Map<String, Object> changes) {
        InterviewPostEntity entity = requirePost(postId);
        applyChanges(entity, changes);
        entityManager.flush();
        if (changes.containsKey("locationLatitude")
                || changes.containsKey("locationLongitude")
                || changes.containsKey("location")
                || changes.containsKey("locationText")
                || changes.containsKey("locationAddress")
                || changes.containsKey("locationPlaceName")
                || changes.containsKey("locationPrecision")
                || changes.containsKey("locationSource")
                || changes.containsKey("interviewMode")) {
            syncLocationPoint(entity);
        }
        return toModel(entity);
    }

    @Override
    public InterviewPostWriteModel updateStatus(UUID postId, String status) {
        return updatePost(postId, Map.of("status", status));
    }

    private InterviewPostEntity requirePost(UUID postId) {
        InterviewPostEntity entity = entityManager.find(InterviewPostEntity.class, postId);
        if (entity == null) {
            throw new IllegalStateException("Interview post not found for update");
        }
        return entity;
    }

    @SuppressWarnings("unchecked")
    private void applyChanges(InterviewPostEntity entity, Map<String, Object> changes) {
        for (Map.Entry<String, Object> entry : changes.entrySet()) {
            switch (entry.getKey()) {
                case "title" -> entity.setTitle((String) entry.getValue());
                case "serviceSummary" -> entity.setServiceSummary((String) entry.getValue());
                case "targetDescription" -> entity.setTargetDescription((String) entry.getValue());
                case "rewardAmount" -> entity.setRewardAmount((Integer) entry.getValue());
                case "durationMinutes" -> entity.setDurationMinutes((Integer) entry.getValue());
                case "recruitCount" -> entity.setRecruitCount((Integer) entry.getValue());
                case "interviewMode" -> entity.setInterviewMode((String) entry.getValue());
                case "location" -> entity.setLocation((String) entry.getValue());
                case "locationText" -> entity.setLocationText((String) entry.getValue());
                case "locationAddress" -> entity.setLocationAddress((String) entry.getValue());
                case "locationPlaceName" -> entity.setLocationPlaceName((String) entry.getValue());
                case "locationLatitude" -> entity.setLocationLatitude(decimal((Double) entry.getValue()));
                case "locationLongitude" -> entity.setLocationLongitude(decimal((Double) entry.getValue()));
                case "locationPrecision" -> entity.setLocationPrecision((String) entry.getValue());
                case "locationSource" -> entity.setLocationSource((String) entry.getValue());
                case "scheduleOptions" -> entity.setScheduleOptions((List<String>) entry.getValue());
                case "status" -> entity.setStatus((String) entry.getValue());
                default -> throw new IllegalArgumentException("Unsupported interview post field: " + entry.getKey());
            }
        }
    }

    private void syncLocationPoint(InterviewPostEntity entity) {
        if (entity.getLocationLatitude() == null || entity.getLocationLongitude() == null) {
            entityManager.createNativeQuery("""
                    update interview_posts
                    set location_point = null
                    where id = :postId
                    """)
                    .setParameter("postId", entity.getId())
                    .executeUpdate();
            return;
        }

        entityManager.createNativeQuery("""
                update interview_posts
                set location_point = extensions.ST_SetSRID(
                  extensions.ST_MakePoint(:lng, :lat),
                  4326
                )::extensions.geography
                where id = :postId
                """)
                .setParameter("postId", entity.getId())
                .setParameter("lat", entity.getLocationLatitude())
                .setParameter("lng", entity.getLocationLongitude())
                .executeUpdate();
    }

    private InterviewPostWriteModel toModel(InterviewPostEntity entity) {
        return new InterviewPostWriteModel(
                entity.getId(),
                entity.getFounderId(),
                entity.getTitle(),
                entity.getServiceSummary(),
                entity.getTargetDescription(),
                entity.getRewardAmount(),
                entity.getDurationMinutes(),
                entity.getRecruitCount(),
                entity.getInterviewMode(),
                entity.getLocation(),
                entity.getLocationText(),
                entity.getLocationAddress(),
                entity.getLocationPlaceName(),
                decimalToDouble(entity.getLocationLatitude()),
                decimalToDouble(entity.getLocationLongitude()),
                entity.getLocationPrecision(),
                entity.getLocationSource(),
                entity.getScheduleOptions(),
                entity.getStatus()
        );
    }

    private BigDecimal decimal(Double value) {
        return value == null ? null : BigDecimal.valueOf(value);
    }

    private Double decimalToDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }
}
