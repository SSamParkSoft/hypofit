package com.contentruck.hypofit.chat.controller;

import com.contentruck.hypofit.chat.dto.ChatMessageCreateRequest;
import com.contentruck.hypofit.chat.dto.ChatMessageResponse;
import com.contentruck.hypofit.chat.dto.ChatRoomReadUpdateRequest;
import com.contentruck.hypofit.chat.dto.ChatRoomResponse;
import com.contentruck.hypofit.chat.dto.ChatRoomSettingsResponse;
import com.contentruck.hypofit.chat.dto.ChatRoomSettingsUpdateRequest;
import com.contentruck.hypofit.chat.dto.ChatWorkflowResponse;
import com.contentruck.hypofit.chat.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

@Validated
@RestController
@RequestMapping("/api/v1/chat")
@io.swagger.v3.oas.annotations.tags.Tag(name = "채팅")
@SecurityRequirement(name = "HTTPBearer")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/rooms/")
    @Operation(summary = "채팅방 목록")
    public List<ChatRoomResponse> listRooms(@AuthenticationPrincipal Jwt jwt) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return chatService.listRooms(currentUserId).stream().map(ChatRoomResponse::from).toList();
    }

    @GetMapping("/rooms/{room_id}")
    @Operation(summary = "채팅방 조회")
    public ChatRoomResponse getRoom(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("room_id") UUID roomId
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return ChatRoomResponse.from(chatService.getRoom(currentUserId, roomId));
    }

    @GetMapping("/rooms/{room_id}/workflow")
    @Operation(summary = "인터뷰 진행 상태 조회")
    public ChatWorkflowResponse getRoomWorkflow(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("room_id") UUID roomId
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return ChatWorkflowResponse.from(chatService.getRoomWorkflow(currentUserId, roomId));
    }

    @PatchMapping("/rooms/{room_id}/settings")
    @Operation(summary = "채팅방 설정 변경")
    public ChatRoomSettingsResponse updateRoomSettings(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("room_id") UUID roomId,
            @Valid @RequestBody ChatRoomSettingsUpdateRequest request
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return ChatRoomSettingsResponse.from(
                chatService.updateRoomSettings(currentUserId, roomId, request.isMuted(), request.isHidden())
        );
    }

    @PostMapping("/rooms/{room_id}/read")
    @Operation(summary = "채팅방 읽음 처리")
    public ChatRoomSettingsResponse markRoomRead(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("room_id") UUID roomId,
            @RequestBody(required = false) ChatRoomReadUpdateRequest request
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return ChatRoomSettingsResponse.from(
                chatService.markRoomRead(currentUserId, roomId, request == null ? null : request.lastReadMessageId())
        );
    }

    @GetMapping("/rooms/{room_id}/messages")
    @Operation(summary = "메시지 목록")
    public List<ChatMessageResponse> listMessages(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("room_id") UUID roomId,
            @RequestParam(name = "limit", defaultValue = "50")
            @Min(1) @Max(100)
            int limit,
            @RequestParam(name = "before", required = false)
            OffsetDateTime before,
            @RequestParam(name = "before_id", required = false)
            UUID beforeId
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return chatService.listMessages(currentUserId, roomId, limit, before, beforeId)
                .stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    @PostMapping("/rooms/{room_id}/messages")
    @Operation(summary = "메시지 전송")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse sendMessage(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("room_id") UUID roomId,
            @Valid @RequestBody ChatMessageCreateRequest request
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return ChatMessageResponse.from(
                chatService.sendMessage(currentUserId, roomId, request.body(), request.clientMessageId())
        );
    }
}
