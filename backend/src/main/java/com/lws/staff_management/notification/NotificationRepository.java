package com.lws.staff_management.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Notification> findByUserIdOrUserIsNullOrderByCreatedAtDesc(Long userId);
    List<Notification> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    @Query("SELECT n FROM Notification n WHERE (:employeeId IS NOT NULL AND n.employee.id = :employeeId) OR (:userId IS NOT NULL AND n.user.id = :userId) OR (n.user IS NULL AND n.employee IS NULL) ORDER BY n.createdAt DESC")
    List<Notification> findForEmployeeOrUser(@Param("employeeId") Long employeeId, @Param("userId") Long userId);

    @Query("SELECT n FROM Notification n WHERE (:userId IS NOT NULL AND n.user.id = :userId) OR (n.user IS NULL AND n.employee IS NULL) ORDER BY n.createdAt DESC")
    List<Notification> findForUserOrBroadcast(@Param("userId") Long userId);

    long countByUserIdAndReadFalse(Long userId);

    Optional<Notification> findFirstByEmployeeIdAndTitleAndLinkOrderByCreatedAtDesc(Long employeeId, String title, String link);

    void deleteByEmployeeIdAndLink(Long employeeId, String link);
}
