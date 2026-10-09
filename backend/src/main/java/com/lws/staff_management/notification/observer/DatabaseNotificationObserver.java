package com.lws.staff_management.notification.observer;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.notification.Notification;
import com.lws.staff_management.notification.NotificationRepository;
import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Concrete Observer in the Observer Design Pattern.
 * Listens to NotificationEvents and persists them to the existing Notification database table.
 */
@Component
public class DatabaseNotificationObserver implements NotificationObserver {

    private static final Logger log = LoggerFactory.getLogger(DatabaseNotificationObserver.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    public DatabaseNotificationObserver(NotificationRepository notificationRepository,
                                        UserRepository userRepository,
                                        EmployeeRepository employeeRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
    }

    @Override
    @Transactional
    public void update(NotificationEvent event) {
        if (event == null) return;

        try {
            // 1. Handle intentional company-wide broadcast
            if (event.isBroadcast()) {
                Notification broadcast = new Notification(
                        null,
                        event.getTitle(),
                        event.getMessage(),
                        event.getType() != null ? event.getType() : "INFO",
                        event.getLink()
                );
                notificationRepository.save(broadcast);
                log.debug("Persisted broadcast notification: {}", event.getTitle());
                return;
            }

            // 2. Resolve target Employee
            Employee employee = event.getEmployee();
            if (employee == null && event.getEmployeeId() != null) {
                employee = employeeRepository.findById(event.getEmployeeId()).orElse(null);
            }

            // 3. Resolve target User
            User user = event.getUser();
            if (user == null && event.getUserId() != null) {
                user = userRepository.findById(event.getUserId()).orElse(null);
            }

            // If user is still not resolved, derive from employee
            if (user == null && employee != null) {
                user = employee.getUser();
                if (user == null && employee.getEmail() != null) {
                    String email = employee.getEmail().trim();
                    user = userRepository.findByEmailIgnoreCase(email)
                            .or(() -> userRepository.findByUsername(email))
                            .orElse(null);
                }
            }

            // If employee is still not resolved, derive from user
            if (employee == null && user != null) {
                final User resolvedUser = user;
                employee = employeeRepository.findByUserId(resolvedUser.getId())
                        .or(() -> employeeRepository.findByEmailIgnoreCase(resolvedUser.getEmail()))
                        .orElse(null);
            }

            // Targeted notification must have at least one recipient identifier
            if (employee == null && user == null) {
                log.warn("Cannot persist targeted notification without resolvable recipient: {}", event.getTitle());
                return;
            }

            // 4. Duplicate Suppression: Prevent duplicate identical notifications within 5 minutes
            if (event.getLink() != null && !event.getLink().isEmpty() && employee != null) {
                Optional<Notification> existing = notificationRepository
                        .findFirstByEmployeeIdAndTitleAndLinkOrderByCreatedAtDesc(employee.getId(), event.getTitle(), event.getLink());
                if (existing.isPresent()) {
                    Notification ex = existing.get();
                    if (ex.getCreatedAt() != null && ex.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(5))) {
                        log.debug("Suppressed duplicate notification '{}' for employee ID {}", event.getTitle(), employee.getId());
                        return;
                    }
                }
            }

            // 5. Save targeted notification entity
            Notification notification = new Notification(
                    employee,
                    user,
                    event.getTitle(),
                    event.getMessage(),
                    event.getType() != null ? event.getType() : "INFO",
                    event.getLink()
            );
            notificationRepository.save(notification);
            log.debug("Persisted targeted notification '{}' for employee {} / user {}",
                    event.getTitle(),
                    employee != null ? employee.getId() : "null",
                    user != null ? user.getId() : "null");

        } catch (Exception e) {
            log.error("Failed to persist notification for event '{}': {}", event.getTitle(), e.getMessage(), e);
        }
    }
}
