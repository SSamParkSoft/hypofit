package com.contentruck.hypofit.user.dto;

import com.contentruck.hypofit.user.service.UserProfileCommands;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;

public final class UserWebModels {

    private UserWebModels() {
    }

    @Schema(requiredProperties = {"name"})
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static final class UserSyncRequest {

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
        @Schema(types = {"null", "string"}, allowableValues = {"team", "company"})
        private String organizationType;
        @Schema(types = {"null", "string"}, maxLength = 100)
        private String organizationName;
        private boolean bioPresent;
        private boolean rolePresent;
        private boolean profileImagePathPresent;
        private boolean profileImageUrlPresent;
        private boolean organizationTypePresent;
        private boolean organizationNamePresent;

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

        public String getOrganizationType() {
            return organizationType;
        }

        public void setOrganizationType(String organizationType) {
            this.organizationType = organizationType;
            this.organizationTypePresent = true;
        }

        public String getOrganizationName() {
            return organizationName;
        }

        public void setOrganizationName(String organizationName) {
            this.organizationName = organizationName;
            this.organizationNamePresent = true;
        }

        @JsonIgnore
        public UserProfileCommands.SyncCommand toCommand() {
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
                    profileImageUrl,
                    organizationTypePresent,
                    organizationType,
                    organizationNamePresent,
                    organizationName
            );
        }
    }

    @Schema(requiredProperties = {"name", "role"})
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static final class UserUpdateRequest {

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
        @Schema(types = {"null", "string"}, allowableValues = {"team", "company"})
        private String organizationType;
        @Schema(types = {"null", "string"}, maxLength = 100)
        private String organizationName;
        private boolean rolePresent;
        private boolean profileImagePathPresent;
        private boolean profileImageUrlPresent;
        private boolean organizationTypePresent;
        private boolean organizationNamePresent;

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

        public String getOrganizationType() {
            return organizationType;
        }

        public void setOrganizationType(String organizationType) {
            this.organizationType = organizationType;
            this.organizationTypePresent = true;
        }

        public String getOrganizationName() {
            return organizationName;
        }

        public void setOrganizationName(String organizationName) {
            this.organizationName = organizationName;
            this.organizationNamePresent = true;
        }

        @JsonIgnore
        public UserProfileCommands.UpdateCommand toCommand() {
            return new UserProfileCommands.UpdateCommand(
                    name,
                    bio,
                    phone,
                    rolePresent,
                    role,
                    profileImagePathPresent,
                    profileImagePath,
                    profileImageUrlPresent,
                    profileImageUrl,
                    organizationTypePresent,
                    organizationType,
                    organizationNamePresent,
                    organizationName
            );
        }
    }
}
