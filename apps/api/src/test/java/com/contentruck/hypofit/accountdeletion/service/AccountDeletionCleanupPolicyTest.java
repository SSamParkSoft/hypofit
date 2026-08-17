package com.contentruck.hypofit.accountdeletion.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AccountDeletionCleanupPolicyTest {

    @Test
    void normalizesSupabaseProfileImageObjectPaths() {
        assertThat(AccountDeletionCleanupPolicy.normalizeProfileImagePath(null)).isNull();
        assertThat(AccountDeletionCleanupPolicy.normalizeProfileImagePath("  /profileimage/users/avatar.png  "))
                .isEqualTo("users/avatar.png");
        assertThat(AccountDeletionCleanupPolicy.normalizeProfileImagePath("///users/avatar.png"))
                .isEqualTo("users/avatar.png");
        assertThat(AccountDeletionCleanupPolicy.normalizeProfileImagePath(" /profileimage/ ")).isNull();
    }

    @Test
    void mapsProfileImageCleanupStatusToRetentionNoteAndBack() {
        for (String status : new String[]{
                "deleted",
                "already_missing",
                "no_profile_image",
                "skipped_missing_storage_config",
                "delete_failed",
                "pending_profile_image_purge"
        }) {
            assertThat(AccountDeletionCleanupPolicy.inferProfileImagePurgeStatus(
                    AccountDeletionCleanupPolicy.buildRetentionNote(status)
            )).isEqualTo(status);
        }
    }
}
