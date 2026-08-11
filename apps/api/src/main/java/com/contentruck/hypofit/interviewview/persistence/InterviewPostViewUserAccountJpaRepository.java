package com.contentruck.hypofit.interviewview.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewPostViewUserAccountJpaRepository extends JpaRepository<InterviewPostViewUserAccountEntity, UUID> {
}
