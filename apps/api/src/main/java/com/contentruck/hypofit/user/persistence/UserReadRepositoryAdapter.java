package com.contentruck.hypofit.user.persistence;

import com.contentruck.hypofit.user.application.UserReadRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class UserReadRepositoryAdapter implements UserReadRepository {

    private final UserJpaRepository userJpaRepository;

    public UserReadRepositoryAdapter(UserJpaRepository userJpaRepository) {
        this.userJpaRepository = userJpaRepository;
    }

    @Override
    public Optional<UserProfileRecord> findById(UUID userId) {
        return userJpaRepository.findById(userId).map(this::toRecord);
    }

    @Override
    public UserProfileRecord saveProfile(UserProfileMutation mutation) {
        UserEntity entity = mutation.id() == null
                ? null
                : userJpaRepository.findById(mutation.id()).orElse(null);

        if (entity == null) {
            entity = new UserEntity();
            entity.setId(mutation.id());
        }

        entity.setEmail(mutation.email());
        entity.setName(mutation.name());
        entity.setBio(mutation.bio());
        entity.setPhone(mutation.phone());
        entity.setRole(mutation.role());
        entity.setProfileImagePath(mutation.profileImagePath());
        entity.setProfileImageUrl(mutation.profileImageUrl());

        return toRecord(userJpaRepository.saveAndFlush(entity));
    }

    private UserProfileRecord toRecord(UserEntity entity) {
        return new UserProfileRecord(
                entity.getId(),
                entity.getEmail(),
                entity.getName(),
                entity.getBio(),
                entity.getPhone(),
                entity.getRole(),
                entity.getProfileImagePath(),
                entity.getProfileImageUrl(),
                entity.getDeactivatedAt() != null,
                entity.getDeletedAt() != null
        );
    }
}
