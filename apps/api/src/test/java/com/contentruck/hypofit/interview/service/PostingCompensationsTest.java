package com.contentruck.hypofit.interview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.common.error.HypofitValidationException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PostingCompensationsTest {

    @ParameterizedTest
    @ValueSource(ints = {-1, 0})
    void explicitCashAndPointsRequirePositiveValue(int value) {
        var cash = new PostingCompensation("cash", null, value, "KRW", null, null, null);
        var points = new PostingCompensation("points", null, null, null, value, null, null);
        for (var compensation : List.of(cash, points)) {
            assertThatThrownBy(() -> PostingCompensations.normalize(List.of(compensation), 0))
                    .isInstanceOf(HypofitValidationException.class);
        }
    }

    @Test
    void legacyZeroStillMeansNoCompensation() {
        assertThat(PostingCompensations.normalize(List.of(), 0))
                .singleElement().satisfies(item -> assertThat(item.type()).isEqualTo("none"));
    }

    @Test
    void supportsMultipleCompensationsWithoutAllowingNoneAlongsideThem() {
        var cash = new PostingCompensation("cash", null, 30000, "KRW", null, null, null);
        var gift = new PostingCompensation("gift_card", "Coffee", null, null, null, null, null);
        var rewards = List.of(cash, gift);
        assertThat(PostingCompensations.normalize(rewards, 0)).isEqualTo(rewards);
        assertThat(PostingCompensations.legacyRewardAmount(rewards)).isEqualTo(30000);
        assertThatThrownBy(() -> PostingCompensations.normalize(List.of(cash,
                new PostingCompensation("none", null, null, null, null, null, null)), 0))
                .isInstanceOf(HypofitValidationException.class);
    }
}
