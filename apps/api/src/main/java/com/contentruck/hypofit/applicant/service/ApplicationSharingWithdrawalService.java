package com.contentruck.hypofit.applicant.service;

import com.contentruck.hypofit.applicant.repository.ApplicationSharingConsentRepository;
import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationSharingWithdrawalService {
    private final ApplicationSharingConsentRepository repository;
    private final AuditWriteService audit;

    public ApplicationSharingWithdrawalService(ApplicationSharingConsentRepository repository, AuditWriteService audit) {
        this.repository = repository;
        this.audit = audit;
    }

    @Transactional
    public void withdraw(UUID applicantId, UUID applicationId) {
        UUID actualApplicant = requireApplicant(applicationId);
        if (!actualApplicant.equals(applicantId)) {
            throw new ApplicationPermissionDeniedException("Only the applicant can withdraw sharing");
        }
        record(applicantId, "user", applicationId, actualApplicant, Map.of());
    }

    @Transactional
    public void withdrawFromTicket(UUID adminId, UUID ticketId, UUID applicationId) {
        UUID applicantId = requireApplicant(applicationId);
        if (!repository.matchesPrivacyTicket(ticketId, applicantId, applicationId)) {
            throw new ApplicationConflictException("An in-review privacy ticket from this applicant is required");
        }
        record(adminId, "operator", applicationId, applicantId, Map.of("ticket_id", ticketId.toString()));
    }

    private UUID requireApplicant(UUID applicationId) {
        UUID applicantId = repository.lockApplicant(applicationId);
        if (applicantId == null) {
            throw new ApplicationNotFoundException("Application not found");
        }
        return applicantId;
    }

    private void record(UUID actorId, String actorType, UUID applicationId, UUID applicantId,
                        Map<String, Object> metadata) {
        if (repository.withdraw(applicationId, applicantId)) {
            audit.record(new AuditEventCommand(actorId, actorType, "application_sharing_withdrawn", "application",
                    applicationId, null, Map.of("sharing_withdrawn", true), null, metadata));
        }
    }
}
