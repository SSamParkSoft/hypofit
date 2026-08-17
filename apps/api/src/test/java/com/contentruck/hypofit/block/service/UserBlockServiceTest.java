package com.contentruck.hypofit.block.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserBlockServiceTest {

    @Mock
    private UserBlockRepository repository;

    private UserBlockService service;

    @BeforeEach
    void setUp() {
        service = new UserBlockService(repository);
    }

    @Test
    void blockUserRejectsSelfBlock() {
        UUID userId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));

        assertThatThrownBy(() -> service.blockUser(userId, userId, new UserBlockCommand("사유")))
                .isInstanceOf(BlockBadRequestException.class)
                .hasMessageContaining("Cannot block yourself");
    }

    @Test
    void blockUserRequiresExistingTarget() {
        UUID blockerId = UUID.randomUUID();
        UUID blockedUserId = UUID.randomUUID();
        when(repository.findUserAccount(blockerId)).thenReturn(Optional.of(activeUser(blockerId)));
        when(repository.findUserSummary(blockedUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.blockUser(blockerId, blockedUserId, new UserBlockCommand("사유")))
                .isInstanceOf(BlockNotFoundException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void blockUserReturnsHydratedSummaryAndRecordsAudit() {
        UUID blockerId = UUID.randomUUID();
        UUID blockedUserId = UUID.randomUUID();
        UUID blockId = UUID.randomUUID();
        BlockedUserSummary blockedUser = new BlockedUserSummary(
                blockedUserId,
                "상대방",
                "테스트 유저",
                "respondent",
                "https://example.com/profile.png"
        );
        when(repository.findUserAccount(blockerId)).thenReturn(Optional.of(activeUser(blockerId)));
        when(repository.findUserSummary(blockedUserId)).thenReturn(Optional.of(blockedUser));
        when(repository.createOrReactivateBlock(blockerId, blockedUserId, "불편한 메시지를 보냈습니다."))
                .thenReturn(new UserBlockReadModel(
                        blockId,
                        blockerId,
                        blockedUserId,
                        "불편한 메시지를 보냈습니다.",
                        "user",
                        OffsetDateTime.of(2026, 7, 31, 12, 0, 0, 0, ZoneOffset.UTC),
                        null,
                        null
                ));

        UserBlockReadModel response = service.blockUser(
                blockerId,
                blockedUserId,
                new UserBlockCommand("불편한 메시지를 보냈습니다.")
        );

        assertThat(response.blockedUser()).isEqualTo(blockedUser);
        verify(repository).recordAuditEvent(
                eq(blockerId),
                eq("user"),
                eq("user_blocked"),
                eq("user"),
                eq(blockedUserId),
                eq("불편한 메시지를 보냈습니다."),
                anyMap()
        );
    }

    @Test
    void unblockUserRequiresExistingBlock() {
        UUID blockerId = UUID.randomUUID();
        UUID blockedUserId = UUID.randomUUID();
        when(repository.findUserAccount(blockerId)).thenReturn(Optional.of(activeUser(blockerId)));
        when(repository.revokeBlock(blockerId, blockedUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.unblockUser(blockerId, blockedUserId))
                .isInstanceOf(BlockNotFoundException.class)
                .hasMessageContaining("Block not found");
    }

    @Test
    void listBlockedUsersRequiresActiveUser() {
        UUID blockerId = UUID.randomUUID();
        when(repository.findUserAccount(blockerId)).thenReturn(Optional.of(activeUser(blockerId)));
        when(repository.listActiveBlocks(blockerId)).thenReturn(List.of());

        List<UserBlockReadModel> result = service.listBlockedUsers(blockerId);

        assertThat(result).isEmpty();
    }

    private BlockActorAccount activeUser(UUID userId) {
        return new BlockActorAccount(userId, "user@example.com", false, false);
    }
}
