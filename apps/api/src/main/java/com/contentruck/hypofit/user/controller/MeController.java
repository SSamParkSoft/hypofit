package com.contentruck.hypofit.user.controller;

import com.contentruck.hypofit.user.dto.UserMeResponse;
import com.contentruck.hypofit.user.dto.UserWebModels;

import com.contentruck.hypofit.user.service.UserQueryService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@io.swagger.v3.oas.annotations.tags.Tag(name = "내 프로필")
@SecurityRequirement(name = "HTTPBearer")
public class MeController {

    private final UserQueryService userQueryService;

    public MeController(UserQueryService userQueryService) {
        this.userQueryService = userQueryService;
    }

    @GetMapping
    public UserMeResponse getMe(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return UserMeResponse.from(userQueryService.getMe(userId));
    }

    @PostMapping("/sync")
    public UserMeResponse syncMe(
            @RequestBody UserWebModels.UserSyncRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return UserMeResponse.from(userQueryService.syncMe(
                userId,
                jwt.getClaimAsString("email"),
                request.toCommand()
        ));
    }

    @PatchMapping
    public UserMeResponse updateMe(
            @RequestBody UserWebModels.UserUpdateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return UserMeResponse.from(userQueryService.updateMe(userId, request.toCommand()));
    }
}
