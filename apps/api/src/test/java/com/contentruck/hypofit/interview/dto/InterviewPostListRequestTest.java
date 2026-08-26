package com.contentruck.hypofit.interview.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.interview.service.InterviewPostListCriteria;
import com.contentruck.hypofit.interview.service.InterviewPostValidationException;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class InterviewPostListRequestTest {

    @Test
    void toCriteriaUsesDefaults() {
        UUID viewerId = UUID.randomUUID();
        InterviewPostListCriteria criteria = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        ).toCriteria(viewerId, false, false);

        assertThat(criteria.viewerId()).isEqualTo(viewerId);
        assertThat(criteria.supportsRecruitmentTypes()).isFalse();
        assertThat(criteria.sort()).isEqualTo("newest");
        assertThat(criteria.limit()).isEqualTo(100);
    }

    @Test
    void toCriteriaRejectsPartialCoordinates() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                37.5,
                null,
                3000,
                "distance",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("lat and lng must be provided together");
    }

    @Test
    void toCriteriaRejectsRadiusWithoutCoordinates() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                3000,
                "newest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("radius_m requires lat and lng");
    }

    @Test
    void toCriteriaRejectsDistanceSortWithoutCoordinates() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "distance",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("sort=distance requires lat and lng");
    }

    @Test
    void toCriteriaRejectsInvalidRewardRange() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                70000,
                20000,
                null,
                null,
                null,
                "newest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("reward_min must be less than or equal to reward_max");
    }

    @Test
    void toCriteriaRejectsQueryLongerThanContractLimit() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                "q".repeat(101),
                null,
                null,
                null,
                null,
                null,
                "newest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("q must be at most 100 characters");
    }

    @Test
    void toCriteriaRejectsNegativeRewardMinimum() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                -1,
                null,
                null,
                null,
                null,
                "newest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("reward_min must be greater than or equal to 0");
    }

    @Test
    void toCriteriaRejectsNegativeRewardMaximum() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                -1,
                null,
                null,
                null,
                "newest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("reward_max must be greater than or equal to 0");
    }

    @Test
    void toCriteriaRejectsLatitudeOutsideContractRange() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                90.00001,
                127.0,
                null,
                "newest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("lat must be between -90 and 90");
    }

    @Test
    void toCriteriaRejectsLongitudeOutsideContractRange() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                37.5,
                180.00001,
                null,
                "newest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("lng must be between -180 and 180");
    }

    @Test
    void toCriteriaPreservesRadiusConstraint() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                37.5,
                127.0,
                499,
                "newest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("radius_m must be between 500 and 20000");
    }

    @Test
    void toCriteriaPreservesLimitConstraint() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "newest",
                101
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("limit must be between 1 and 100");
    }

    @Test
    void toCriteriaPreservesSortConstraint() {
        InterviewPostListRequest request = new InterviewPostListRequest(
                "open",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "oldest",
                100
        );

        assertThatThrownBy(() -> request.toCriteria(null, false, false))
                .isInstanceOf(InterviewPostValidationException.class)
                .hasMessageContaining("sort must be one of newest, distance, reward");
    }
}
