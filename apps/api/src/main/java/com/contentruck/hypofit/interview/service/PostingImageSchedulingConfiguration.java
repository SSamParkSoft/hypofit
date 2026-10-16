package com.contentruck.hypofit.interview.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "hypofit", name = "posting-images-enabled", havingValue = "true")
@EnableScheduling
public class PostingImageSchedulingConfiguration {
}
