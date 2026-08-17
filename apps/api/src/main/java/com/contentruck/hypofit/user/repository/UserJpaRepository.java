package com.contentruck.hypofit.user.repository;

import com.contentruck.hypofit.user.entity.UserEntity;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
}
