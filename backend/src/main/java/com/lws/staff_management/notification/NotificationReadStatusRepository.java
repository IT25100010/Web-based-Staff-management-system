package com.lws.staff_management.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationReadStatusRepository extends JpaRepository<NotificationReadStatus, Long> {
    boolean existsByNotificationIdAndUserId(Long notificationId, Long userId);
    Optional<NotificationReadStatus> findByNotificationIdAndUserId(Long notificationId, Long userId);
    List<NotificationReadStatus> findByUserId(Long userId);
    void deleteByNotificationId(Long notificationId);
}
