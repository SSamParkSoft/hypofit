package com.contentruck.hypofit.accountdeletion.repository;

import com.contentruck.hypofit.accountdeletion.entity.AccountDeletionRequestEntity;

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

    @Query(value = """
            select r.* from account_deletion_requests r
            where (cast(:status as text) is null or r.status = :status)
              and strpos(lower(concat(cast(r.id as text), ' ', cast(r.user_id as text), ' ',
                  case when r.email_redacted_at is null then r.email else '' end, ' ',
                  left(r.email_hash, 12), ' ', r.reason)), :search) > 0
            order by r.updated_at desc, r.id desc
            """, nativeQuery = true)
    java.util.List<AccountDeletionRequestEntity> searchForAdmin(
            @Param("status") String status, @Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );
}
