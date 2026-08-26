package com.contentruck.hypofit.survey.repository;

import com.contentruck.hypofit.survey.entity.SurveyInterviewPostEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyInterviewPostJpaRepository extends JpaRepository<SurveyInterviewPostEntity, UUID> {
}
