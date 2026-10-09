package com.lws.staff_management.auth.repository;

import com.lws.staff_management.auth.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    Optional<EmailOtp> findByChallengeId(String challengeId);

    Optional<EmailOtp> findByChallengeIdAndUsedFalse(String challengeId);

    Optional<EmailOtp> findFirstByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(String email);

    Optional<EmailOtp> findFirstByEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    Optional<EmailOtp> findByUserId(Long userId);

    void deleteByUserId(Long userId);

    void deleteByEmailIgnoreCase(String email);

    @Modifying
    @Query("UPDATE EmailOtp o SET o.used = true WHERE LOWER(o.email) = LOWER(:email) AND o.used = false")
    void invalidateActiveOtps(String email);

    @Modifying
    @Query("UPDATE EmailOtp o SET o.used = true WHERE o.userId = :userId AND o.used = false")
    void invalidateActiveChallengesForUser(Long userId);
}
