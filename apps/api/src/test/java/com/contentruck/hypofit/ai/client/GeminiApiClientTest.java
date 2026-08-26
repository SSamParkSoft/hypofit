package com.contentruck.hypofit.ai.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class GeminiApiClientTest {

    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void doesNotCallProviderWithoutApiKey() {
        GeminiApiClient client = new GeminiApiClient(RestClient.builder(), new HypofitProperties());

        GeminiApiClient.GeminiConnectionResult result = client.verifyAccess();

        assertThat(result.status()).isEqualTo("not_configured");
        assertThat(result.authenticated()).isFalse();
    }

    @Test
    void authenticatesWithApiKeyHeaderAndListsOneModel() throws IOException {
        AtomicReference<String> apiKeyHeader = new AtomicReference<>();
        AtomicReference<String> requestTarget = new AtomicReference<>();
        startServer(exchange -> {
            apiKeyHeader.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            requestTarget.set(exchange.getRequestURI().toString());
            respond(exchange, 200, "{\"models\":[{\"name\":\"models/gemini-test\"}]}");
        });

        GeminiApiClient.GeminiConnectionResult result = configuredClient().verifyAccess();

        assertThat(result.authenticated()).isTrue();
        assertThat(result.accessibleModels()).isEqualTo(1);
        assertThat(apiKeyHeader).hasValue("test-gemini-key");
        assertThat(requestTarget).hasValue("/v1beta/models?pageSize=1");
    }

    @Test
    void returnsSanitizedUnavailableStatusForProviderFailure() throws IOException {
        startServer(exchange -> respond(exchange, 401, "{}"));

        GeminiApiClient.GeminiConnectionResult result = configuredClient().verifyAccess();

        assertThat(result.status()).isEqualTo("unavailable");
        assertThat(result.authenticated()).isFalse();
    }

    private GeminiApiClient configuredClient() {
        HypofitProperties properties = new HypofitProperties();
        properties.setGeminiApiKey("test-gemini-key");
        properties.setGeminiApiBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        return new GeminiApiClient(RestClient.builder(), properties);
    }

    private void startServer(ExchangeHandler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", handler::handle);
        server.start();
    }

    private void respond(HttpExchange exchange, int status, String responseBody) throws IOException {
        byte[] body = responseBody.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    @FunctionalInterface
    private interface ExchangeHandler {
        void handle(HttpExchange exchange) throws IOException;
    }
}
