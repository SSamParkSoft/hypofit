package com.contentruck.hypofit.interview.client;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class SupabasePostingImageClient {
    public static final String BUCKET = "posting-images";
    public static final int MAX_BYTES = 3 * 1024 * 1024;
    private final HypofitProperties properties;
    private final RestClient client;
    private final ObjectMapper objectMapper;

    public SupabasePostingImageClient(HypofitProperties properties, RestClient.Builder builder, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(4));
        factory.setReadTimeout(Duration.ofSeconds(12));
        client = builder.requestFactory(factory).build();
    }

    public String uploadToken(String path) {
        JsonNode response = post("/object/upload/sign/" + BUCKET + "/" + path, Map.of());
        String url = response.path("url").asText();
        String token = UriComponentsBuilder.fromUriString(url).build().getQueryParams().getFirst("token");
        if (token == null) throw unavailable();
        return token;
    }

    public byte[] download(String path) {
        try {
            return client.get().uri(url("/object/" + BUCKET + "/" + path))
                    .headers(this::authorize).exchange((request, response) -> {
                        if (!response.getStatusCode().is2xxSuccessful()) throw unavailable();
                        byte[] bytes = response.getBody().readNBytes(MAX_BYTES + 1);
                        if (bytes.length > MAX_BYTES) throw new HypofitException(
                                "posting_image_too_large", "이미지는 한 장당 3MB 이하로 올려 주세요.", 400, null);
                        return bytes;
                    });
        } catch (RestClientException exception) {
            throw unavailable();
        }
    }

    public void upload(String path, byte[] bytes) {
        try {
            client.post().uri(url("/object/" + BUCKET + "/" + path))
                    .headers(this::authorize).contentType(MediaType.IMAGE_JPEG)
                    .body(bytes).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            // A completion retry uses the same immutable output. Never overwrite caller-controlled bytes.
            throw unavailable();
        }
    }

    public Map<String, String> sign(List<String> paths) {
        if (paths.isEmpty()) return Map.of();
        JsonNode response = post("/object/sign/" + BUCKET, Map.of("paths", paths, "expiresIn", 900));
        Map<String, String> urls = new LinkedHashMap<>();
        for (JsonNode entry : response) {
            String signedUrl = entry.path("signedURL").asText();
            if (!signedUrl.isBlank()) urls.put(entry.path("path").asText(), url(signedUrl));
        }
        return urls;
    }

    public void remove(List<String> paths) {
        try {
            client.method(org.springframework.http.HttpMethod.DELETE).uri(url("/object/" + BUCKET))
                    .headers(this::authorize).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("prefixes", paths)).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            throw unavailable();
        }
    }

    private JsonNode post(String path, Object body) {
        try {
            String response = client.post().uri(url(path)).headers(this::authorize)
                    .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class);
            if (response == null) throw unavailable();
            JsonNode result = objectMapper.readTree(response);
            if (result == null) throw unavailable();
            return result;
        } catch (RestClientException | JsonProcessingException exception) {
            throw unavailable();
        }
    }

    private void authorize(org.springframework.http.HttpHeaders headers) {
        String serviceKey = key();
        headers.set("apikey", serviceKey);
        if (!serviceKey.startsWith("sb_secret_")) headers.setBearerAuth(serviceKey);
    }

    private String url(String path) {
        return properties.getSupabaseUrl().replaceAll("/+$", "") + "/storage/v1" + path;
    }

    private String key() {
        if (properties.getSupabaseServiceRoleKey().isBlank() || properties.getSupabaseUrl().isBlank()) throw unavailable();
        return properties.getSupabaseServiceRoleKey();
    }

    private HypofitException unavailable() {
        return new HypofitException("posting_image_storage_unavailable", "이미지를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.", 503, null);
    }
}
