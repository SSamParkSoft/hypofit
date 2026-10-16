package com.contentruck.hypofit.user.service;


import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.service.SocialAuthAdminClient;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserQueryService {

    private final UserReadRepository userReadRepository;
    private final SocialAuthAdminClient authAdminClient;

    public UserQueryService(UserReadRepository userReadRepository, SocialAuthAdminClient authAdminClient) {
        this.userReadRepository = userReadRepository;
        this.authAdminClient = authAdminClient;
    }

    @Transactional(readOnly = true)
    public UserProfile getMe(UUID userId) {
        return requireActiveProfile(userId).toDomain();
    }

    @Transactional
    public UserProfile syncMe(UUID userId, String email, UserProfileCommands.SyncCommand command) {
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
        return userReadRepository.saveProfile(new UserReadRepository.UserProfileMutation(
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
