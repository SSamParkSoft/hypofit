package com.contentruck.hypofit.user.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.user.application.UserProfileCommands.SyncCommand;
import com.contentruck.hypofit.user.application.UserProfileCommands.UpdateCommand;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserQueryServiceTest {

    @Mock
    private UserReadRepository userReadRepository;

    private UserQueryService userQueryService;

    @BeforeEach
    void setUp() {
        userQueryService = new UserQueryService(userReadRepository);
    }

    @Test
    void getMeReturnsActiveUserProfile() {
        UUID userId = UUID.randomUUID();
        when(userReadRepository.findById(userId)).thenReturn(Optional.of(activeRecord(userId)));

        var profile = userQueryService.getMe(userId);

        assertThat(profile.id()).isEqualTo(userId);
        assertThat(profile.email()).isEqualTo("user@example.com");
        assertThat(profile.name()).isEqualTo("세현");
        assertThat(profile.role()).isEqualTo("both");
    }

    @Test
    void getMeRejectsMissingDeletedAndDeactivatedProfiles() {
        UUID userId = UUID.randomUUID();
        when(userReadRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userQueryService.getMe(userId))
                .isInstanceOf(UserProfileMissingException.class);

        when(userReadRepository.findById(userId)).thenReturn(Optional.of(new UserReadRepository.UserProfileRecord(
                userId,
                "user@example.com",
                "세현",
                null,
                null,
                "respondent",
                null,
                null,
                false,
                true
        )));

        assertThatThrownBy(() -> userQueryService.getMe(userId))
                .isInstanceOf(UserAccountDeletedException.class);

        when(userReadRepository.findById(userId)).thenReturn(Optional.of(new UserReadRepository.UserProfileRecord(
                userId,
                "user@example.com",
                "세현",
                null,
                null,
                "respondent",
                null,
                null,
                true,
                false
        )));

        assertThatThrownBy(() -> userQueryService.getMe(userId))
                .isInstanceOf(UserAccountDeactivatedException.class);
    }

    @Test
    void syncMeCreatesProfileAndNormalizesPhoneRoleAndBio() {
        UUID userId = UUID.randomUUID();
        when(userReadRepository.findById(userId)).thenReturn(Optional.empty());
        when(userReadRepository.saveProfile(any())).thenAnswer(invocation -> {
            UserReadRepository.UserProfileMutation mutation = invocation.getArgument(0);
            return new UserReadRepository.UserProfileRecord(
                    userId,
                    mutation.email(),
                    mutation.name(),
                    mutation.bio(),
                    mutation.phone(),
                    mutation.role(),
                    mutation.profileImagePath(),
                    mutation.profileImageUrl(),
                    false,
                    false
            );
        });

        var profile = userQueryService.syncMe(
                userId,
                "sync@example.com",
                new SyncCommand(
                        "  세현  ",
                        true,
                        "  초기   고객   검증  중  ",
                        "+82 10 1234 5678",
                        false,
                        "respondent",
                        false,
                        null,
                        false,
                        null
                )
        );

        assertThat(profile.email()).isEqualTo("sync@example.com");
        assertThat(profile.name()).isEqualTo("세현");
        assertThat(profile.bio()).isEqualTo("초기 고객 검증 중");
        assertThat(profile.phone()).isEqualTo("010-1234-5678");
        assertThat(profile.role()).isEqualTo("respondent");
    }

    @Test
    void syncMePreservesExistingOptionalFieldsWhenOmitted() {
        UUID userId = UUID.randomUUID();
        UserReadRepository.UserProfileRecord existing = activeRecord(userId);
        when(userReadRepository.findById(userId)).thenReturn(Optional.of(existing));
        when(userReadRepository.saveProfile(any())).thenAnswer(invocation -> {
            UserReadRepository.UserProfileMutation mutation = invocation.getArgument(0);
            return new UserReadRepository.UserProfileRecord(
                    userId,
                    mutation.email(),
                    mutation.name(),
                    mutation.bio(),
                    mutation.phone(),
                    mutation.role(),
                    mutation.profileImagePath(),
                    mutation.profileImageUrl(),
                    false,
                    false
            );
        });

        userQueryService.syncMe(
                userId,
                "updated@example.com",
                new SyncCommand(
                        "세현",
                        false,
                        null,
                        null,
                        false,
                        "respondent",
                        false,
                        null,
                        false,
                        null
                )
        );

        ArgumentCaptor<UserReadRepository.UserProfileMutation> captor = ArgumentCaptor.forClass(UserReadRepository.UserProfileMutation.class);
        verify(userReadRepository).saveProfile(captor.capture());
        assertThat(captor.getValue().bio()).isEqualTo(existing.bio());
        assertThat(captor.getValue().profileImagePath()).isEqualTo(existing.profileImagePath());
        assertThat(captor.getValue().profileImageUrl()).isEqualTo(existing.profileImageUrl());
    }

    @Test
    void syncMeClearsOptionalFieldsWhenExplicitNull() {
        UUID userId = UUID.randomUUID();
        UserReadRepository.UserProfileRecord existing = activeRecord(userId);
        when(userReadRepository.findById(userId)).thenReturn(Optional.of(existing));

        when(userReadRepository.saveProfile(any())).thenAnswer(invocation -> {
            UserReadRepository.UserProfileMutation mutation = invocation.getArgument(0);
            return new UserReadRepository.UserProfileRecord(
                    userId,
                    mutation.email(),
                    mutation.name(),
                    mutation.bio(),
                    mutation.phone(),
                    mutation.role(),
                    mutation.profileImagePath(),
                    mutation.profileImageUrl(),
                    false,
                    false
            );
        });

        var cleared = userQueryService.syncMe(
                userId,
                "updated@example.com",
                new SyncCommand(
                        "세현",
                        true,
                        null,
                        null,
                        false,
                        "respondent",
                        true,
                        null,
                        true,
                        null
                )
        );

        assertThat(cleared.bio()).isNull();
        assertThat(cleared.profileImagePath()).isNull();
        assertThat(cleared.profileImageUrl()).isNull();
    }

    @Test
    void updateMeClearsBioAndPhoneWhenOmittedButPreservesImagesWhenOmitted() {
        UUID userId = UUID.randomUUID();
        UserReadRepository.UserProfileRecord existing = activeRecord(userId);
        when(userReadRepository.findById(userId)).thenReturn(Optional.of(existing));
        when(userReadRepository.saveProfile(any())).thenAnswer(invocation -> {
            UserReadRepository.UserProfileMutation mutation = invocation.getArgument(0);
            return new UserReadRepository.UserProfileRecord(
                    userId,
                    mutation.email(),
                    mutation.name(),
                    mutation.bio(),
                    mutation.phone(),
                    mutation.role(),
                    mutation.profileImagePath(),
                    mutation.profileImageUrl(),
                    false,
                    false
            );
        });

        var updated = userQueryService.updateMe(
                userId,
                new UpdateCommand(
                        "  새 이름 ",
                        null,
                        null,
                        true,
                        "founder",
                        false,
                        null,
                        false,
                        null
                )
        );

        assertThat(updated.name()).isEqualTo("새 이름");
        assertThat(updated.bio()).isNull();
        assertThat(updated.phone()).isNull();
        assertThat(updated.role()).isEqualTo("founder");
        assertThat(updated.profileImagePath()).isEqualTo(existing.profileImagePath());
        assertThat(updated.profileImageUrl()).isEqualTo(existing.profileImageUrl());
    }

    @Test
    void syncAndUpdateRejectInvalidPhoneOrMissingRole() {
        UUID userId = UUID.randomUUID();
        when(userReadRepository.findById(userId)).thenReturn(Optional.of(activeRecord(userId)));

        assertThatThrownBy(() -> userQueryService.syncMe(
                userId,
                "user@example.com",
                new SyncCommand(
                        "세현",
                        false,
                        null,
                        "12345",
                        false,
                        "respondent",
                        false,
                        null,
                        false,
                        null
                )
        )).isInstanceOf(HypofitValidationException.class);

        assertThatThrownBy(() -> userQueryService.updateMe(
                userId,
                new UpdateCommand(
                        "세현",
                        null,
                        null,
                        false,
                        null,
                        false,
                        null,
                        false,
                        null
                )
        )).isInstanceOf(HypofitValidationException.class);
    }

    private UserReadRepository.UserProfileRecord activeRecord(UUID userId) {
        return new UserReadRepository.UserProfileRecord(
                userId,
                "user@example.com",
                "세현",
                "초기 고객 검증 중",
                "010-1234-5678",
                "both",
                "profile/path.png",
                "https://cdn.example.com/profile.png",
                false,
                false
        );
    }
}
