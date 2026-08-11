package com.contentruck.hypofit.interviewview.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewPostViewJpaRepository extends JpaRepository<InterviewPostViewEntity, UUID> {
    List<InterviewPostViewEntity> findByUserIdOrderByLastViewedAtDesc(UUID userId);
}
