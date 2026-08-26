package com.contentruck.hypofit.user.service;

import com.contentruck.hypofit.user.service.UserProfileCommands.SyncCommand;
import com.contentruck.hypofit.user.service.UserProfileCommands.UpdateCommand;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import java.util.ArrayList;
import java.util.List;

final class UserProfileInputNormalizer {

    private UserProfileInputNormalizer() {
    }

    static UserReadRepository.UserProfileMutation normalizeSync(
            UserReadRepository.UserProfileRecord existing,
            String userEmail,
            SyncCommand command
    ) {
        List<FieldError> issues = new ArrayList<>();
        String normalizedName = normalizeName(command.name(), issues);
        String normalizedBio = command.bioPresent()
                ? normalizeBio(command.bio(), issues)
                : existing == null ? null : existing.bio();
        String normalizedPhone = normalizePhone(command.phone(), issues);
        String normalizedRole = normalizeRole(command.rolePresent(), command.role(), issues);
        String normalizedProfileImagePath = command.profileImagePathPresent()
                ? normalizeProfileImagePath(command.profileImagePath(), issues)
                : existing == null ? null : existing.profileImagePath();
        String normalizedProfileImageUrl = command.profileImageUrlPresent()
                ? normalizeProfileImageUrl(command.profileImageUrl(), issues)
                : existing == null ? null : existing.profileImageUrl();
        Organization organization = normalizeOrganization(
                command.organizationTypePresent()
                        ? command.organizationType()
                        : existing == null ? null : existing.organizationType(),
                command.organizationNamePresent()
                        ? command.organizationName()
                        : existing == null ? null : existing.organizationName(),
                issues
        );
        throwIfInvalid(issues);
        return new UserReadRepository.UserProfileMutation(
                existing == null ? null : existing.id(),
                userEmail,
                normalizedName,
                normalizedBio,
                normalizedPhone,
                normalizedRole,
                normalizedProfileImagePath,
                normalizedProfileImageUrl,
                organization.type(),
                organization.name()
        );
    }

    static UserReadRepository.UserProfileMutation normalizeUpdate(
            UserReadRepository.UserProfileRecord existing,
            UpdateCommand command
    ) {
        List<FieldError> issues = new ArrayList<>();
        String normalizedName = normalizeName(command.name(), issues);
        String normalizedBio = normalizeBio(command.bio(), issues);
        String normalizedPhone = normalizePhone(command.phone(), issues);
        String normalizedRole = normalizeRole(command.rolePresent(), command.role(), issues);
        String normalizedProfileImagePath = command.profileImagePathPresent()
                ? normalizeProfileImagePath(command.profileImagePath(), issues)
                : existing.profileImagePath();
        String normalizedProfileImageUrl = command.profileImageUrlPresent()
                ? normalizeProfileImageUrl(command.profileImageUrl(), issues)
                : existing.profileImageUrl();
        Organization organization = normalizeOrganization(
                command.organizationTypePresent() ? command.organizationType() : existing.organizationType(),
                command.organizationNamePresent() ? command.organizationName() : existing.organizationName(),
                issues
        );
        throwIfInvalid(issues);
        return new UserReadRepository.UserProfileMutation(
                existing.id(),
                existing.email(),
                normalizedName,
                normalizedBio,
                normalizedPhone,
                normalizedRole,
                normalizedProfileImagePath,
                normalizedProfileImageUrl,
                organization.type(),
                organization.name()
        );
    }

    private static String normalizeName(String value, List<FieldError> issues) {
        if (value == null) {
            issues.add(new FieldError("name", "이름을 입력하세요."));
            return null;
        }
        String stripped = value.trim();
        if (stripped.isEmpty()) {
            issues.add(new FieldError("name", "이름을 입력하세요."));
            return null;
        }
        if (stripped.length() > 100) {
            issues.add(new FieldError("name", "이름은 100자 이하로 입력해 주세요."));
        }
        return stripped;
    }

    private static String normalizeBio(String value, List<FieldError> issues) {
        if (value == null) {
            return null;
        }
        if (value.length() > 120) {
            issues.add(new FieldError("bio", "한 줄 소개는 120자 이하로 입력해 주세요."));
        }
        String stripped = String.join(" ", value.trim().split("\\s+"));
        return stripped.isBlank() ? null : stripped;
    }

    private static String normalizePhone(String value, List<FieldError> issues) {
        if (value == null) {
            return null;
        }

        String stripped = value.trim();
        if (stripped.isEmpty()) {
            return null;
        }
        if (stripped.length() > 40) {
            issues.add(new FieldError("phone", "전화번호는 40자 이하로 입력해 주세요."));
            return null;
        }

        StringBuilder digitsBuilder = new StringBuilder();
        for (char character : stripped.toCharArray()) {
            if (Character.isDigit(character)) {
                digitsBuilder.append(character);
            }
        }
        String digits = digitsBuilder.toString();
        if (digits.startsWith("82")) {
            digits = "0" + digits.substring(2);
        }
        if (!digits.startsWith("0")) {
            issues.add(new FieldError("phone", "전화번호는 0으로 시작하는 국내 번호를 입력하세요."));
            return null;
        }

        if (digits.length() == 11 && digits.startsWith("010")) {
            return digits.substring(0, 3) + "-" + digits.substring(3, 7) + "-" + digits.substring(7);
        }
        if (digits.length() == 10 && digits.startsWith("02")) {
            return digits.substring(0, 2) + "-" + digits.substring(2, 6) + "-" + digits.substring(6);
        }
        if (digits.length() == 10) {
            return digits.substring(0, 3) + "-" + digits.substring(3, 6) + "-" + digits.substring(6);
        }
        if (digits.length() == 11) {
            return digits.substring(0, 3) + "-" + digits.substring(3, 7) + "-" + digits.substring(7);
        }

        issues.add(new FieldError("phone", "전화번호는 10~11자리 국내 번호로 입력하세요."));
        return null;
    }

    private static String normalizeRole(boolean rolePresent, String role, List<FieldError> issues) {
        if (!rolePresent) {
            return "both";
        }
        if (role == null || role.isBlank()) {
            issues.add(new FieldError("role", "역할을 선택해 주세요."));
            return null;
        }
        String normalized = role.trim().toLowerCase();
        if (!List.of("founder", "respondent", "both").contains(normalized)) {
            issues.add(new FieldError("role", "역할을 확인해 주세요."));
            return null;
        }
        return "both";
    }

    private static String normalizeProfileImagePath(String value, List<FieldError> issues) {
        if (value == null) {
            return null;
        }
        if (value.length() > 500) {
            issues.add(new FieldError("profile_image_path", "프로필 이미지 경로는 500자 이하로 입력해 주세요."));
        }
        return value;
    }

    private static String normalizeProfileImageUrl(String value, List<FieldError> issues) {
        if (value == null) {
            return null;
        }
        if (value.length() > 1000) {
            issues.add(new FieldError("profile_image_url", "프로필 이미지 주소는 1000자 이하로 입력해 주세요."));
        }
        return value;
    }

    private static Organization normalizeOrganization(
            String organizationType,
            String organizationName,
            List<FieldError> issues
    ) {
        String type = organizationType == null ? null : organizationType.trim().toLowerCase();
        String name = organizationName == null
                ? null
                : String.join(" ", organizationName.trim().split("\\s+"));

        if (type != null && type.isBlank()) {
            type = null;
        }
        if (name != null && name.isBlank()) {
            name = null;
        }
        if (type == null && name == null) {
            return new Organization(null, null);
        }
        if (type == null || !List.of("team", "company").contains(type)) {
            issues.add(new FieldError("organization_type", "소속 유형을 선택해 주세요."));
        }
        if (name == null) {
            issues.add(new FieldError("organization_name", "팀 또는 회사 이름을 입력해 주세요."));
        } else if (name.length() > 100) {
            issues.add(new FieldError("organization_name", "팀 또는 회사 이름은 100자 이하로 입력해 주세요."));
        }
        return new Organization(type, name);
    }

    private record Organization(String type, String name) {
    }

    private static void throwIfInvalid(List<FieldError> issues) {
        if (!issues.isEmpty()) {
            throw new HypofitValidationException("User profile validation failed", issues);
        }
    }
}
