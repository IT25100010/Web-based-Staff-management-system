package com.lws.staff_management.notification;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;
import com.lws.staff_management.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * High-level notification helper service delegating to the Observer-based NotificationPublisher.
 */
@Service
public class NotificationService {

    private final NotificationPublisher notificationPublisher;
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationPublisher notificationPublisher,
                               NotificationRepository notificationRepository) {
        this.notificationPublisher = notificationPublisher;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void sendTargetedNotification(Employee employee, String title, String message, String type, String link) {
        if (employee == null) return;
        notificationPublisher.publish(NotificationEvent.targeted(employee, title, message, type, link));
    }

    @Transactional
    public void sendTargetedNotification(User user, String title, String message, String type, String link) {
        if (user == null) return;
        notificationPublisher.publish(NotificationEvent.targeted(user, title, message, type, link));
    }

    @Transactional
    public void sendBroadcastNotification(String title, String message, String type, String link) {
        notificationPublisher.publish(NotificationEvent.broadcast(title, message, type, link));
    }

    @Transactional
    public void removeTargetedNotificationByLink(Long employeeId, String link) {
        if (employeeId != null && link != null) {
            try {
                notificationRepository.deleteByEmployeeIdAndLink(employeeId, link);
            } catch (Exception ignored) {}
        }
    }
}
