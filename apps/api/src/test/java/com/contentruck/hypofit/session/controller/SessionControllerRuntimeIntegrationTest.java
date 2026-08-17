package com.contentruck.hypofit.session.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.contentruck.hypofit.HypofitApplication;
import com.contentruck.hypofit.common.observability.RequestIdFilter;
import com.contentruck.hypofit.session.service.SessionReadModels;
import com.contentruck.hypofit.session.service.SessionWorkflowService;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(
        classes = HypofitApplication.class,
        properties = {
                "spring.profiles.active=test",
                "hypofit.database-url=postgresql://postgres:postgres@127.0.0.1:5432/hypofit",
                "hypofit.supabase-jwt-secret=test-secret-test-secret-test-secret-1234",
                "hypofit.jwt-audience=authenticated"
        }
)
class SessionControllerRuntimeIntegrationTest {

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private RequestIdFilter requestIdFilter;

    @MockitoBean
    private SessionWorkflowService sessionWorkflowService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .addFilters(requestIdFilter)
                .apply(springSecurity())
                .build();
    }

    @Test
    void createSessionBindsCanonicalSnakeCaseRequestAtRuntime() throws Exception {
        UUID founderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        OffsetDateTime scheduledAt = OffsetDateTime.parse("2026-08-08T10:00:00Z");
        when(sessionWorkflowService.createSession(
                eq(founderId),
                eq(applicationId),
                eq(scheduledAt),
                eq("online"),
                eq("https://example.com/meeting"),
                any()
        )).thenReturn(new SessionReadModels.InterviewSessionReadModel(
                UUID.randomUUID(),
                applicationId,
                scheduledAt,
                "online",
                "https://example.com/meeting",
                null,
                "scheduled",
                null
        ));

        mockMvc.perform(post("/api/v1/sessions/")
                        .with(jwt().jwt(token -> token.subject(founderId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "application_id": "%s",
                                  "scheduled_at": "2026-08-08T10:00:00Z",
                                  "meeting_type": "online",
                                  "meeting_url": "https://example.com/meeting",
                                  "place": null
                                }
                                """.formatted(applicationId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.application_id").value(applicationId.toString()))
                .andExpect(jsonPath("$.scheduled_at").value("2026-08-08T10:00:00Z"))
                .andExpect(jsonPath("$.meeting_type").value("online"))
                .andExpect(jsonPath("$.status").value("scheduled"));
    }
}
