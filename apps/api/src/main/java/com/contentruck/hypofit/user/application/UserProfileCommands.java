package com.contentruck.hypofit.user.application;

public final class UserProfileCommands {

    private UserProfileCommands() {
    }

    public record SyncCommand(
            String name,
            boolean bioPresent,
            String bio,
            String phone,
            boolean rolePresent,
            String role,
            boolean profileImagePathPresent,
            String profileImagePath,
            boolean profileImageUrlPresent,
            String profileImageUrl
    ) {
    }

    public record UpdateCommand(
            String name,
            String bio,
            String phone,
            boolean rolePresent,
            String role,
            boolean profileImagePathPresent,
            String profileImagePath,
            boolean profileImageUrlPresent,
            String profileImageUrl
    ) {
    }
}
