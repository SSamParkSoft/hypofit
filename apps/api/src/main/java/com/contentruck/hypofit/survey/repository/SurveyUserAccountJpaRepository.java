package com.contentruck.hypofit.survey.repository;

import com.contentruck.hypofit.survey.entity.SurveyUserAccountEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyUserAccountJpaRepository extends JpaRepository<SurveyUserAccountEntity, UUID> {

    List<SurveyUserAccountEntity> findAllByIdIn(Collection<UUID> userIds);
}
