import org.gradle.api.tasks.testing.Test

plugins {
    java
    checkstyle
    id("org.springframework.boot") version "4.1.0"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.contentruck"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

checkstyle {
    toolVersion = "10.21.2"
    configFile = file("config/checkstyle/checkstyle.xml")
    isShowViolations = true
}

configurations.configureEach {
    resolutionStrategy {
        failOnDynamicVersions()
        failOnChangingVersions()
        failOnNonReproducibleResolution()
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("com.fasterxml.jackson.core:jackson-databind")
    implementation("com.nimbusds:nimbus-jose-jwt")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.3")
    implementation("org.springframework.modulith:spring-modulith-starter-core:2.1.0")
    runtimeOnly("io.micrometer:micrometer-registry-prometheus")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-test-autoconfigure")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test:2.1.0")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}

tasks.test {
    filter {
        excludeTestsMatching("*PostgresIntegrationTest")
        excludeTestsMatching("*FlywayPreparationIntegrationTest")
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs.addAll(listOf(
        "-Xlint:all,-processing,-serial,-auxiliaryclass,-deprecation",
        "-Werror"
    ))
}

tasks.register<Test>("integrationTest") {
    description = "Runs Spring integration tests."
    group = "verification"
    useJUnitPlatform()
    filter {
        includeTestsMatching("*IntegrationTest")
    }
    shouldRunAfter(tasks.test)
}
