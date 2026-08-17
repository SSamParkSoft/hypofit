package com.contentruck.hypofit.interviewview.repository;

import com.contentruck.hypofit.interviewview.entity.InterviewPostViewUserAccountEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewPostViewUserAccountJpaRepository extends JpaRepository<InterviewPostViewUserAccountEntity, UUID> {
}
