package com.contentruck.hypofit.user.web;

import com.contentruck.hypofit.user.application.UserProfileCommands;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;

final class UserWebModels {

    private UserWebModels() {
    }

    @Schema(requiredProperties = {"name"})
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    static final class UserSyncRequest {

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 100)
        private String name;
        @Schema(types = {"null", "string"}, maxLength = 120)
        private String bio;
        @Schema(types = {"null", "string"}, maxLength = 40)
        private String phone;
        @Schema(defaultValue = "respondent", allowableValues = {"both", "founder", "respondent"})
        private String role = "respondent";
        @Schema(types = {"null", "string"}, maxLength = 500)
        private String profileImagePath;
        @Schema(types = {"null", "string"}, maxLength = 1000)
        private String profileImageUrl;
        private boolean bioPresent;
        private boolean rolePresent;
        private boolean profileImagePathPresent;
        private boolean profileImageUrlPresent;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getBio() {
            return bio;
        }

        public void setBio(String bio) {
            this.bio = bio;
            this.bioPresent = true;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
            this.rolePresent = true;
        }

        public String getProfileImagePath() {
            return profileImagePath;
        }

        public void setProfileImagePath(String profileImagePath) {
            this.profileImagePath = profileImagePath;
            this.profileImagePathPresent = true;
        }

        public String getProfileImageUrl() {
            return profileImageUrl;
        }

        public void setProfileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
            this.profileImageUrlPresent = true;
        }

        @JsonIgnore
        UserProfileCommands.SyncCommand toCommand() {
            return new UserProfileCommands.SyncCommand(
                    name,
                    bioPresent,
                    bio,
                    phone,
                    rolePresent,
                    role,
                    profileImagePathPresent,
                    profileImagePath,
                    profileImageUrlPresent,
                    profileImageUrl
            );
        }
    }

    @Schema(requiredProperties = {"name", "role"})
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    static final class UserUpdateRequest {

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 100)
        private String name;
        @Schema(types = {"null", "string"}, maxLength = 120)
        private String bio;
        @Schema(types = {"null", "string"}, maxLength = 40)
        private String phone;
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"both", "founder", "respondent"})
        private String role;
        @Schema(types = {"null", "string"}, maxLength = 500)
        private String profileImagePath;
        @Schema(types = {"null", "string"}, maxLength = 1000)
        private String profileImageUrl;
        private boolean rolePresent;
        private boolean profileImagePathPresent;
        private boolean profileImageUrlPresent;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getBio() {
            return bio;
        }

        public void setBio(String bio) {
            this.bio = bio;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
            this.rolePresent = true;
        }

        public String getProfileImagePath() {
            return profileImagePath;
        }

        public void setProfileImagePath(String profileImagePath) {
            this.profileImagePath = profileImagePath;
            this.profileImagePathPresent = true;
        }

        public String getProfileImageUrl() {
            return profileImageUrl;
        }

        public void setProfileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
            this.profileImageUrlPresent = true;
        }

        @JsonIgnore
        UserProfileCommands.UpdateCommand toCommand() {
            return new UserProfileCommands.UpdateCommand(
                    name,
                    bio,
                    phone,
                    rolePresent,
                    role,
                    profileImagePathPresent,
                    profileImagePath,
                    profileImageUrlPresent,
                    profileImageUrl
            );
        }
    }
}
