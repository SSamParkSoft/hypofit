package com.contentruck.hypofit.user.repository;

import com.contentruck.hypofit.user.dto.LegalAcknowledgementsRequest;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LegalAcknowledgementRepository {
    private final JdbcTemplate jdbcTemplate;

    public LegalAcknowledgementRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void recordSignup(UUID userId, LegalAcknowledgementsRequest request) {
        jdbcTemplate.update("""
                insert into user_legal_acknowledgements (
                    user_id, document_revision, document_status, action, source,
                    terms_accepted, privacy_notice_acknowledged, age_19_confirmed
                ) values (?, ?, 'published', 'signup', ?, true, true, true)
                on conflict (user_id, action, document_revision) do nothing
                """, userId, request.documentRevision(), request.source());
    }
}
