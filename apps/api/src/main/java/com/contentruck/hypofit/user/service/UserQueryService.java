package com.contentruck.hypofit.user.service;


import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.service.SocialAuthAdminClient;
import com.contentruck.hypofit.user.dto.LegalAcknowledgementsRequest;
import com.contentruck.hypofit.user.repository.LegalAcknowledgementRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserQueryService {

    private final UserReadRepository userReadRepository;
    private final SocialAuthAdminClient authAdminClient;
    private final LegalAcknowledgementRepository legalAcknowledgementRepository;
    private final String publishedLegalRevision;

    public UserQueryService(
            UserReadRepository userReadRepository,
            SocialAuthAdminClient authAdminClient,
            LegalAcknowledgementRepository legalAcknowledgementRepository,
            @Value("${hypofit.legal.published-revision:}") String publishedLegalRevision
    ) {
        this.userReadRepository = userReadRepository;
        this.authAdminClient = authAdminClient;
        this.legalAcknowledgementRepository = legalAcknowledgementRepository;
        this.publishedLegalRevision = publishedLegalRevision;
    }

    @Transactional(readOnly = true)
    public UserProfile getMe(UUID userId) {
        return requireActiveProfile(userId).toDomain();
    }

    @Transactional
    public UserProfile syncMe(
            UUID userId, String email, UserProfileCommands.SyncCommand command,
            LegalAcknowledgementsRequest acknowledgements
    ) {
        validateAcknowledgements(acknowledgements);
        UserReadRepository.UserProfileRecord existing = userReadRepository.findById(userId).orElse(null);
        if (existing != null && existing.deleted()) {
            throw new UserAccountDeletedException();
        }
        if (existing != null && existing.deactivated()) {
            throw new UserAccountDeactivatedException();
        }

        // JWT email identifies contact data, not provider verification. Gate only profile creation.
        String profileEmail = existing == null ? requireVerifiedSignupEmail(userId, email) : existing.email();
        UserReadRepository.UserProfileMutation mutation = UserProfileInputNormalizer.normalizeSync(
                existing,
                profileEmail,
                command
        );
        UserProfile profile = userReadRepository.saveProfile(new UserReadRepository.UserProfileMutation(
                userId,
                mutation.email(),
                mutation.name(),
                mutation.bio(),
                mutation.phone(),
                mutation.role(),
                mutation.profileImagePath(),
                mutation.profileImageUrl(),
                mutation.organizationType(),
                mutation.organizationName()
        )).toDomain();
        if (acknowledgements != null) {
            legalAcknowledgementRepository.recordSignup(userId, acknowledgements);
        }
        return profile;
    }

    private void validateAcknowledgements(LegalAcknowledgementsRequest request) {
        if (request == null) {
            return;
        }
        // Empty until the policy bundle is finalized and approved for publication.
        if (publishedLegalRevision.isBlank()
                || !publishedLegalRevision.equals(request.documentRevision())
                || !"published".equals(request.documentStatus())
                || !"signup".equals(request.action())
                || request.source() == null
                || !List.of("web_onboarding", "ios_onboarding", "android_onboarding").contains(request.source())
                || !Boolean.TRUE.equals(request.termsAccepted())
                || !Boolean.TRUE.equals(request.privacyNoticeAcknowledged())
                || !Boolean.TRUE.equals(request.age19Confirmed())) {
            throw new HypofitException(
                    "legal_acknowledgements_invalid",
                    "가입 확인 문서의 버전과 상태를 다시 확인해 주세요.",
                    422,
                    "Signup acknowledgement must reference the configured published document revision"
            );
        }
    }

    private String requireVerifiedSignupEmail(UUID userId, String email) {
        if (email != null && !email.isBlank()) {
            return authAdminClient.getAuthUser(userId).identities().stream()
                    .filter(identity -> List.of("apple", "google", "kakao").contains(identity.provider()))
                    .filter(identity -> Boolean.TRUE.equals(identity.emailVerified()))
                    .filter(identity -> email.trim().equalsIgnoreCase(identity.email()))
                    .map(identity -> identity.email())
                    .findFirst()
                    .orElseThrow(this::emailNotVerified);
        }
        throw emailNotVerified();
    }

    private HypofitException emailNotVerified() {
        return new HypofitException(
                "social_email_missing",
                "소셜 계정에서 인증된 이메일을 확인하지 못했어요. 다른 로그인 방법을 이용해 주세요.",
                403,
                "New profile requires a matching verified email from a supported provider identity"
        );
    }

    @Transactional
    public UserProfile updateMe(UUID userId, UserProfileCommands.UpdateCommand command) {
        UserReadRepository.UserProfileRecord existing = requireActiveProfile(userId);
        UserReadRepository.UserProfileMutation mutation = UserProfileInputNormalizer.normalizeUpdate(existing, command);
        return userReadRepository.saveProfile(mutation).toDomain();
    }

    private UserReadRepository.UserProfileRecord requireActiveProfile(UUID userId) {
        UserReadRepository.UserProfileRecord record = userReadRepository.findById(userId)
                .orElseThrow(UserProfileMissingException::new);
        if (record.deleted()) {
            throw new UserAccountDeletedException();
        }
        if (record.deactivated()) {
            throw new UserAccountDeactivatedException();
        }
        return record;
    }
}
