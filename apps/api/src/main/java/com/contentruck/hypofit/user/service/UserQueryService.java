package com.contentruck.hypofit.user.service;


import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserQueryService {

    private final UserReadRepository userReadRepository;

    public UserQueryService(UserReadRepository userReadRepository) {
        this.userReadRepository = userReadRepository;
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

        UserReadRepository.UserProfileMutation mutation = UserProfileInputNormalizer.normalizeSync(
                existing,
                Objects.requireNonNull(email, "email"),
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
