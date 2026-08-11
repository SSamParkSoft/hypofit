package com.contentruck.hypofit.block.web;

import com.contentruck.hypofit.block.application.UserBlockService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "HTTPBearer")
public class UserBlockController {

    private final UserBlockService userBlockService;

    public UserBlockController(UserBlockService userBlockService) {
        this.userBlockService = userBlockService;
    }

    @GetMapping("/me/blocked-users")
    public List<UserBlockResponse> listMyBlockedUsers(@AuthenticationPrincipal Jwt jwt) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return userBlockService.listBlockedUsers(currentUserId)
                .stream()
                .map(UserBlockResponse::from)
                .toList();
    }

    @PostMapping("/users/{user_id}/block")
    @ResponseStatus(HttpStatus.CREATED)
    public UserBlockResponse blockUser(
            @PathVariable("user_id") UUID userId,
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = UserBlockCreateRequest.OpenApiSchema.class))
            )
            @RequestBody UserBlockCreateRequest request
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return UserBlockResponse.from(
                userBlockService.blockUser(currentUserId, userId, UserBlockCreateRequestParser.parse(request))
        );
    }

    @DeleteMapping("/users/{user_id}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unblockUser(
            @PathVariable("user_id") UUID userId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        userBlockService.unblockUser(currentUserId, userId);
    }
}
