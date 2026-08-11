package com.contentruck.hypofit.accountdeletion.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountDeletionRequestJpaRepository extends JpaRepository<AccountDeletionRequestEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from AccountDeletionRequestEntity request where request.id = :requestId")
    Optional<AccountDeletionRequestEntity> findForUpdateById(@Param("requestId") UUID requestId);

    Optional<AccountDeletionRequestEntity> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<AccountDeletionRequestEntity> findFirstBySourceAndEmailHashOrderByCreatedAtDesc(String source, String emailHash);

    java.util.List<AccountDeletionRequestEntity> findByStatusOrderByUpdatedAtDesc(String status, org.springframework.data.domain.Pageable pageable);

    java.util.List<AccountDeletionRequestEntity> findAllByOrderByUpdatedAtDesc(org.springframework.data.domain.Pageable pageable);
}
