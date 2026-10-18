package com.contentruck.hypofit.applicant.repository;

import com.contentruck.hypofit.applicant.service.ApplicationSharingConsent;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ApplicationSharingConsentRepository {
    private final JdbcTemplate jdbcTemplate;

    public ApplicationSharingConsentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void record(UUID applicationId, UUID applicantId, UUID recipientId, String source) {
        String recipientName = jdbcTemplate.queryForObject("select name from app_users where id = ?", String.class, recipientId);
        jdbcTemplate.update("""
                insert into application_sharing_consents
                    (application_id, applicant_id, recipient_id, revision, source, disclosure_snapshot)
                values (?, ?, ?, ?, ?, jsonb_build_object(
                    'recipient_id', cast(? as text), 'recipient_name', cast(? as text),
                    'purpose', cast(? as text), 'fields', cast(? as text),
                    'retention', cast(? as text), 'refusal', cast(? as text)))
                """, applicationId, applicantId, recipientId, ApplicationSharingConsent.REVISION, source,
                recipientId.toString(), recipientName, ApplicationSharingConsent.PURPOSE, ApplicationSharingConsent.FIELDS,
                ApplicationSharingConsent.RETENTION, ApplicationSharingConsent.REFUSAL);
    }

    public boolean withdraw(UUID applicationId, UUID applicantId) {
        return jdbcTemplate.update("""
                update applications set sharing_withdrawn_at = statement_timestamp()
                where id = ? and respondent_id = ? and sharing_withdrawn_at is null
                """, applicationId, applicantId) == 1;
    }

    public UUID lockApplicant(UUID applicationId) {
        return jdbcTemplate.query("select respondent_id from applications where id = ? for update",
                (rs, row) -> rs.getObject("respondent_id", UUID.class), applicationId)
                .stream().findFirst().orElse(null);
    }

    public boolean isWithdrawn(UUID applicationId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "select sharing_withdrawn_at is not null from applications where id = ?", Boolean.class, applicationId));
    }

    public boolean matchesPrivacyTicket(UUID ticketId, UUID applicantId, UUID applicationId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject("""
                select exists(select 1 from support_tickets
                where id = ? and user_id = ? and status = 'in_review'
                  and (kind = 'privacy' or category = 'privacy')
                  and (target_id is null or (target_type = 'application' and target_id = ?)))
                """, Boolean.class, ticketId, applicantId, applicationId));
    }
}
