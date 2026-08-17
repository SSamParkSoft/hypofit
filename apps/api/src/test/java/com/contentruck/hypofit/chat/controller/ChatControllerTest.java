package com.contentruck.hypofit.chat.controller;

import com.contentruck.hypofit.chat.dto.ChatMessageCreateRequest;
import com.contentruck.hypofit.chat.dto.ChatMessageResponse;
import com.contentruck.hypofit.chat.dto.ChatRoomReadUpdateRequest;
import com.contentruck.hypofit.chat.dto.ChatRoomResponse;
import com.contentruck.hypofit.chat.dto.ChatRoomSettingsResponse;
import com.contentruck.hypofit.chat.dto.ChatWorkflowResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.chat.service.ChatService;
import com.contentruck.hypofit.chat.service.ChatApplicationSummary;
import com.contentruck.hypofit.chat.service.ChatMessageReadModel;
import com.contentruck.hypofit.chat.service.ChatRoomReadModel;
import com.contentruck.hypofit.chat.service.ChatRoomSettingsModel;
import com.contentruck.hypofit.chat.service.ChatUserSummary;
import com.contentruck.hypofit.chat.service.ChatWorkflowReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private ChatService chatService;

    @Test
    void listRoomsUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
        when(chatService.listRooms(userId)).thenReturn(List.of(room(userId)));

        ChatController controller = new ChatController(chatService);
        List<ChatRoomResponse> response = controller.listRooms(jwt);

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().founderId()).isEqualTo(userId);
    }

    @Test
    void sendMessageUsesClientMessageIdAndReturnsMessage() {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
        ChatMessageReadModel message = new ChatMessageReadModel(
                UUID.randomUUID(),
                roomId,
                userId,
                "user",
                "내일 가능하세요?",
                "client-1",
                Map.of(),
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        when(chatService.sendMessage(userId, roomId, "내일 가능하세요?", "client-1")).thenReturn(message);

        ChatController controller = new ChatController(chatService);
        ChatMessageResponse response = controller.sendMessage(
                jwt,
                roomId,
                new ChatMessageCreateRequest("내일 가능하세요?", "client-1")
        );

        assertThat(response.roomId()).isEqualTo(roomId);
        assertThat(response.clientMessageId()).isEqualTo("client-1");
    }

    @Test
    void markRoomReadPassesOptionalMessageId() {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
        ChatRoomSettingsModel settings = new ChatRoomSettingsModel(roomId, userId, false, false, OffsetDateTime.now(ZoneOffset.UTC));
        when(chatService.markRoomRead(userId, roomId, messageId)).thenReturn(settings);

        ChatController controller = new ChatController(chatService);
        ChatRoomSettingsResponse response = controller.markRoomRead(
                jwt,
                roomId,
                new ChatRoomReadUpdateRequest(messageId)
        );

        assertThat(response.roomId()).isEqualTo(roomId);
        assertThat(response.userId()).isEqualTo(userId);
    }

    @Test
    void markRoomReadAllowsNullBody() {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
        ChatRoomSettingsModel settings = new ChatRoomSettingsModel(roomId, userId, false, false, OffsetDateTime.now(ZoneOffset.UTC));
        when(chatService.markRoomRead(userId, roomId, null)).thenReturn(settings);

        ChatController controller = new ChatController(chatService);
        ChatRoomSettingsResponse response = controller.markRoomRead(jwt, roomId, null);

        assertThat(response.roomId()).isEqualTo(roomId);
        assertThat(response.userId()).isEqualTo(userId);
    }

    @Test
    void getRoomWorkflowUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
        when(chatService.getRoomWorkflow(userId, roomId)).thenReturn(new ChatWorkflowReadModel(
                "selected",
                "선정됐어요",
                "채팅에서 일정과 진행 방식을 조율해 주세요.",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false
        ));

        ChatController controller = new ChatController(chatService);
        ChatWorkflowResponse response = controller.getRoomWorkflow(jwt, roomId);

        assertThat(response.step()).isEqualTo("selected");
        assertThat(response.title()).isEqualTo("선정됐어요");
    }

    private static ChatRoomReadModel room(UUID founderId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        UUID respondentId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        return new ChatRoomReadModel(
                roomId,
                UUID.randomUUID(),
                UUID.randomUUID(),
                founderId,
                respondentId,
                "open",
                now,
                now,
                now,
                new ChatApplicationSummary(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        Map.of(),
                        List.of(),
                        respondentId,
                        "applied",
                        null,
                        new ChatUserSummary(respondentId, "참여자", null, "respondent", null)
                ),
                null,
                new ChatUserSummary(founderId, "창업자", null, "founder", null),
                new ChatUserSummary(respondentId, "참여자", null, "respondent", null),
                null,
                0,
                false,
                false,
                null
        );
    }
}
