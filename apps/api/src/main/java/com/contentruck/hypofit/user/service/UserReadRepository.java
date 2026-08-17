package com.contentruck.hypofit.user.service;

import java.util.Optional;
import java.util.UUID;

public interface UserReadRepository {
    Optional<UserProfileRecord> findById(UUID userId);

    UserProfileRecord saveProfile(UserProfileMutation mutation);

    record UserProfileRecord(
            UUID id,
            String email,
            String name,
            String bio,
            String phone,
            String role,
            String profileImagePath,
            String profileImageUrl,
            String organizationType,
            String organizationName,
            boolean deactivated,
            boolean deleted
    ) {
        public UserProfile toDomain() {
            return new UserProfile(
                    id,
                    email,
                    name,
                    bio,
                    phone,
                    role,
                    profileImagePath,
                    profileImageUrl,
                    organizationType,
                    organizationName
            );
        }
    }

    record UserProfileMutation(
            UUID id,
            String email,
            String name,
            String bio,
            String phone,
            String role,
            String profileImagePath,
            String profileImageUrl,
            String organizationType,
            String organizationName
    ) {
    }
}
