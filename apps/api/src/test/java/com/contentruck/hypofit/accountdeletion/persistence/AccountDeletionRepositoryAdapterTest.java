package com.contentruck.hypofit.accountdeletion.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.accountdeletion.application.AccountDeletionRepository.AccountDeletionRequestMutation;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AccountDeletionRepositoryAdapterTest {

    @Mock
    private AccountDeletionRequestJpaRepository requestJpaRepository;

    @Mock
    private AccountDeletionUserJpaRepository userJpaRepository;

    @Mock
    private AccountDeletionPushDeviceJpaRepository pushDeviceJpaRepository;

    @Mock
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Test
    void disablePushDevicesMarksEnabledRowsAsDisabled() {
        UUID userId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        AccountDeletionPushDeviceEntity first = device(userId);
        AccountDeletionPushDeviceEntity second = device(userId);
        when(pushDeviceJpaRepository.findAllByUserIdAndEnabledTrue(userId)).thenReturn(List.of(first, second));

        AccountDeletionRepositoryAdapter adapter = new AccountDeletionRepositoryAdapter(
                requestJpaRepository,
                userJpaRepository,
                pushDeviceJpaRepository,
                jdbcTemplate,
                new ObjectMapper()
        );

        int count = adapter.disablePushDevices(userId, now, "account_deleted", now);

        assertThat(count).isEqualTo(2);
        assertThat(first.isEnabled()).isFalse();
        assertThat(first.getDisabledReason()).isEqualTo("account_deleted");
        verify(pushDeviceJpaRepository).saveAllAndFlush(List.of(first, second));
    }

    @Test
    void saveRequestPersistsVerificationFields() {
        UUID requestId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        when(requestJpaRepository.findById(requestId)).thenReturn(Optional.empty());
        when(requestJpaRepository.saveAndFlush(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));

        AccountDeletionRepositoryAdapter adapter = new AccountDeletionRepositoryAdapter(
                requestJpaRepository,
                userJpaRepository,
                pushDeviceJpaRepository,
                jdbcTemplate,
                new ObjectMapper()
        );

        adapter.saveRequest(new AccountDeletionRequestMutation(
                requestId,
                null,
                "user@example.com",
                "email-hash",
                null,
                "사용자",
                "삭제",
                "requested",
                "public_web",
                null,
                "code-hash",
                now.plusMinutes(10),
                0,
                now.plusSeconds(90),
                null,
                1,
                now,
                null,
                null,
                null,
                null,
                null,
                "verification_email_sent",
                null,
                null,
                null,
                null,
                null,
                now,
                now
        ));

        ArgumentCaptor<AccountDeletionRequestEntity> captor = ArgumentCaptor.forClass(AccountDeletionRequestEntity.class);
        verify(requestJpaRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getVerificationCodeHash()).isEqualTo("code-hash");
        assertThat(captor.getValue().getVerificationSendCount()).isEqualTo(1);
        assertThat(captor.getValue().getResult()).isEqualTo("verification_email_sent");
    }

    private AccountDeletionPushDeviceEntity device(UUID userId) {
        AccountDeletionPushDeviceEntity entity = new AccountDeletionPushDeviceEntity();
        entity.setId(UUID.randomUUID());
        entity.setUserId(userId);
        entity.setEnabled(true);
        entity.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return entity;
    }
}
