# syntax=docker/dockerfile:1.7

FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /workspace

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts gradle.properties ./
COPY config config

RUN chmod +x gradlew \
    && ./gradlew --no-daemon dependencies >/dev/null

COPY src src

RUN ./gradlew --no-daemon bootJar \
    && jar_path="$(find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | sort | head -n 1)" \
    && test -n "$jar_path" \
    && cp "$jar_path" /tmp/hypofit-api.jar

FROM eclipse-temurin:21-jre-jammy AS runtime

ARG OCI_REVISION=unknown
ARG OCI_SOURCE=https://github.com/SSamParkSoft/hypofit

LABEL org.opencontainers.image.title="Hypofit API" \
      org.opencontainers.image.description="Hypofit Spring Boot API and push worker" \
      org.opencontainers.image.source="$OCI_SOURCE" \
      org.opencontainers.image.revision="$OCI_REVISION"

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 hypofit \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin hypofit

WORKDIR /app

COPY --from=builder --chown=10001:10001 /tmp/hypofit-api.jar /app/hypofit-api.jar

USER 10001:10001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/hypofit-api.jar"]
