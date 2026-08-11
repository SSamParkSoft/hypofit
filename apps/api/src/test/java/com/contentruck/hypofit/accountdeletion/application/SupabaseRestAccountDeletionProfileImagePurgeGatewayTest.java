package com.contentruck.hypofit.accountdeletion.application;

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

class SupabaseRestAccountDeletionProfileImagePurgeGatewayTest {

    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void returnsNoImageWithoutCallingSupabase() {
        SupabaseRestAccountDeletionProfileImagePurgeGateway gateway = gateway(new HypofitProperties());

        assertThat(gateway.purgeProfileImage("  ")).isEqualTo("no_profile_image");
    }

    @Test
    void returnsMissingConfigWhenStorageCredentialsAreUnavailable() {
        SupabaseRestAccountDeletionProfileImagePurgeGateway gateway = gateway(new HypofitProperties());

        assertThat(gateway.purgeProfileImage("profileimage/users/avatar.png"))
                .isEqualTo("skipped_missing_storage_config");
    }

    @Test
    void deletesEncodedNestedObjectWithSupabaseAdminHeaders() throws IOException {
        AtomicReference<String> rawPath = new AtomicReference<>();
        AtomicReference<String> authorization = new AtomicReference<>();
        AtomicReference<String> apiKey = new AtomicReference<>();
        startServer(exchange -> {
            rawPath.set(exchange.getRequestURI().getRawPath());
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            apiKey.set(exchange.getRequestHeaders().getFirst("apikey"));
            respond(exchange, 200);
        });

        SupabaseRestAccountDeletionProfileImagePurgeGateway gateway = gateway(configuredProperties());

        assertThat(gateway.purgeProfileImage("/profileimage/users/한 글/avatar 1.png"))
                .isEqualTo("deleted");
        assertThat(rawPath.get()).isEqualTo(
                "/storage/v1/object/profileimage/users/%ED%95%9C%20%EA%B8%80/avatar%201.png"
        );
        assertThat(authorization.get()).isEqualTo("Bearer service-role-key");
        assertThat(apiKey.get()).isEqualTo("service-role-key");
    }

    @Test
    void treatsMissingObjectAsAlreadyDeleted() throws IOException {
        startServer(exchange -> respond(exchange, 404));

        assertThat(gateway(configuredProperties()).purgeProfileImage("users/missing.png"))
                .isEqualTo("already_missing");
    }

    @Test
    void convertsUnexpectedStorageResponseToDeleteFailed() throws IOException {
        startServer(exchange -> respond(exchange, 503));

        assertThat(gateway(configuredProperties()).purgeProfileImage("users/avatar.png"))
                .isEqualTo("delete_failed");
    }

    private SupabaseRestAccountDeletionProfileImagePurgeGateway gateway(HypofitProperties properties) {
        return new SupabaseRestAccountDeletionProfileImagePurgeGateway(RestClient.builder(), properties);
    }

    private HypofitProperties configuredProperties() {
        HypofitProperties properties = new HypofitProperties();
        properties.setSupabaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.setSupabaseServiceRoleKey("service-role-key");
        return properties;
    }

    private void startServer(ExchangeHandler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> handler.handle(exchange));
        server.start();
    }

    private void respond(HttpExchange exchange, int status) throws IOException {
        byte[] body = "{}".getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    @FunctionalInterface
    private interface ExchangeHandler {
        void handle(HttpExchange exchange) throws IOException;
    }
}
