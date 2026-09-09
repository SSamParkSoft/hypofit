package com.contentruck.hypofit.maintenance.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.maintenance.service.MaintenanceRepository;
import com.contentruck.hypofit.maintenance.service.MaintenanceService;
import com.contentruck.hypofit.notice.service.NoticeService;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class MaintenancePostgresIntegrationTest extends PostgresIntegrationTestSupport {
    @Autowired private MaintenanceRepository repository;
    @Autowired private MaintenanceService service;
    @Autowired private NoticeService notices;

    private final OffsetDateTime bannerStart = OffsetDateTime.parse("2030-09-09T00:00:00Z");

    @Test
    void bannerWindowIncludesBannerStartButExcludesMaintenanceStart() {
        var created = service.create(actor(), command(true), false);
        assertThat(repository.findVisibleScheduled(bannerStart.minusNanos(1000))).isEmpty();
        assertThat(repository.findVisibleScheduled(bannerStart)).get()
                .satisfies(row -> assertThat(row.id()).isEqualTo(created.id()));
        assertThat(repository.findVisibleScheduled(created.startsAt().minusSeconds(1))).isPresent();
        assertThat(repository.findVisibleScheduled(created.startsAt())).isEmpty();
    }

    @Test
    void hiddenAndCancelledReservationsDoNotExposeBanner() {
        UUID actor = actor();
        service.create(actor, command(false), false);
        assertThat(repository.findVisibleScheduled(bannerStart)).isEmpty();
        var visible = service.create(actor, command(true), false);
        service.cancel(actor, visible.id());
        assertThat(repository.findVisibleScheduled(bannerStart)).isEmpty();
        assertThatThrownBy(() -> service.start(actor, visible.id())).isInstanceOf(HypofitException.class);
    }

    @Test
    void activeLifecycleSuppressesBannerAndRejectsDuplicateStart() {
        UUID actor = actor();
        var created = service.create(actor, command(true), false);
        service.start(actor, created.id());
        assertThat(repository.findVisibleScheduled(bannerStart)).isEmpty();
        assertThat(service.active().status()).isEqualTo("IN_PROGRESS");
        assertThatThrownBy(() -> service.start(actor, created.id())).isInstanceOf(HypofitException.class);
        service.verify(actor, created.id());
        assertThat(service.active().status()).isEqualTo("VERIFYING");
        service.complete(actor, created.id());
        assertThat(service.active()).isNull();
        assertThat(repository.findVisibleScheduled(bannerStart)).isEmpty();
        assertThatThrownBy(() -> service.start(actor, created.id())).isInstanceOf(HypofitException.class);
    }

    @Test
    void reservationUpdateRefreshesPublishedLinkedNoticeWithoutCreatingAnother() {
        UUID actor = actor();
        var created = service.create(actor, command(true), true);
        var changed = new MaintenanceRepository.WriteCommand("변경한 점검", "변경한 안내 문구",
                bannerStart.plusDays(2), bannerStart.plusDays(2).plusHours(2), true, bannerStart);
        service.update(actor, created.id(), changed);
        var notice = notices.getPublished(created.noticeId());
        assertThat(notice.title()).isEqualTo(changed.title());
        assertThat(notice.body()).contains(changed.message(), changed.startsAt().toString(), changed.endsAt().toString());
        assertThat(notices.listAll()).hasSize(1);
        assertThat(service.get(created.id()).noticeId()).isEqualTo(created.noticeId());
    }

    private MaintenanceRepository.WriteCommand command(boolean showBanner) {
        return new MaintenanceRepository.WriteCommand("점검 예약", "서비스 점검 안내",
                bannerStart.plusHours(2), bannerStart.plusHours(4), showBanner, showBanner ? bannerStart : null);
    }

    private UUID actor() {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("insert into app_users (id,email,name,role) values (?,?,?,?)",
                id, id + "@example.com", "테스트 운영자", "both");
        return id;
    }
}
