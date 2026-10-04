package com.lws.staff_management.notification;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationReadStatusRepository readStatusRepository;
    private final NotificationPublisher notificationPublisher;

    public NotificationController(NotificationRepository notificationRepository,
                                  UserRepository userRepository,
                                  EmployeeRepository employeeRepository,
                                  NotificationReadStatusRepository readStatusRepository,
                                  NotificationPublisher notificationPublisher) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.readStatusRepository = readStatusRepository;
        this.notificationPublisher = notificationPublisher;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@AuthenticationPrincipal UserPrincipal currentUser) {
        return fetchForUser(currentUser);
    }

    @GetMapping("/my")
    public ResponseEntity<List<Notification>> getMyNotifications(@AuthenticationPrincipal UserPrincipal currentUser) {
        return fetchForUser(currentUser);
    }

    private ResponseEntity<List<Notification>> fetchForUser(UserPrincipal currentUser) {
        Long userId = resolveUserId(currentUser);
        if (userId == null) {
            // SECURITY: Never fall back to findAll(). Return 401 Unauthorized.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long employeeId = resolveEmployeeId(userId, currentUser);

        List<Notification> list;
        if (employeeId != null) {
            list = notificationRepository.findForEmployeeOrUser(employeeId, userId);
        } else {
            list = notificationRepository.findForUserOrBroadcast(userId);
        }

        // Apply per-user read status for broadcast notifications
        for (Notification n : list) {
            if (n.getUser() == null && n.getEmployee() == null) {
                if (readStatusRepository.existsByNotificationIdAndUserId(n.getId(), userId)) {
                    n.setRead(true);
                }
            }
        }

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Notification> getNotificationById(@PathVariable Long id,
                                                            @AuthenticationPrincipal UserPrincipal currentUser) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        Long currentUserId = resolveUserId(currentUser);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long linkedEmployeeId = resolveEmployeeId(currentUserId, currentUser);

        if (!canAccessNotification(n, currentUserId, linkedEmployeeId)) {
            throw new AccessDeniedException("Access denied: You do not have permission to view this notification.");
        }

        if (n.getUser() == null && n.getEmployee() == null) {
            if (readStatusRepository.existsByNotificationIdAndUserId(n.getId(), currentUserId)) {
                n.setRead(true);
            }
        }

        return ResponseEntity.ok(n);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsReadPatch(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal currentUser) {
        return markReadInternal(id, currentUser);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsReadPut(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal currentUser) {
        return markReadInternal(id, currentUser);
    }

    private ResponseEntity<?> markReadInternal(Long id, UserPrincipal currentUser) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        Long currentUserId = resolveUserId(currentUser);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long linkedEmployeeId = resolveEmployeeId(currentUserId, currentUser);

        if (!canAccessNotification(n, currentUserId, linkedEmployeeId)) {
            throw new AccessDeniedException("Access denied: Cannot mark notification of another user as read.");
        }

        // For broadcast notifications, record read status per user
        if (n.getUser() == null && n.getEmployee() == null) {
            if (!readStatusRepository.existsByNotificationIdAndUserId(id, currentUserId)) {
                readStatusRepository.save(new NotificationReadStatus(id, currentUserId));
            }
            return ResponseEntity.ok(Map.of("message", "Broadcast notification marked as read for current user"));
        }

        n.setRead(true);
        notificationRepository.save(n);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal currentUser) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        Long currentUserId = resolveUserId(currentUser);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long linkedEmployeeId = resolveEmployeeId(currentUserId, currentUser);

        if (n.getUser() == null && n.getEmployee() == null) {
            boolean isManager = currentUser != null && currentUser.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_HR_MANAGER") || a.getAuthority().equals("ROLE_SENIOR_ADMIN"));
            if (!isManager) {
                throw new AccessDeniedException("Access denied: Only managers can delete broadcast notifications.");
            }
        } else {
            if (!canAccessNotification(n, currentUserId, linkedEmployeeId)) {
                throw new AccessDeniedException("Access denied: Cannot delete notification of another user.");
            }
        }

        readStatusRepository.deleteByNotificationId(id);
        notificationRepository.delete(n);
        return ResponseEntity.ok(Map.of("message", "Notification deleted successfully."));
    }

    @PostMapping("/broadcast")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> broadcastNotification(@RequestBody java.util.Map<String, String> payload) {
        notificationPublisher.publish(NotificationEvent.broadcast(
                payload.get("title"),
                payload.get("message"),
                payload.getOrDefault("type", "INFO"),
                payload.get("link")
        ));
        return ResponseEntity.ok(java.util.Map.of("message", "Broadcast notification sent successfully"));
    }

    private Long resolveUserId(UserPrincipal currentUser) {
        if (currentUser != null) {
            return currentUser.getId();
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
            String name = auth.getName();
            return userRepository.findByUsername(name)
                    .or(() -> userRepository.findByEmail(name))
                    .map(User::getId)
                    .orElse(null);
        }
        return null;
    }

    private Long resolveEmployeeId(Long userId, UserPrincipal currentUser) {
        if (currentUser != null && currentUser.getEmail() != null) {
            Optional<Employee> byEmail = employeeRepository.findByEmailIgnoreCase(currentUser.getEmail());
            if (byEmail.isPresent()) {
                return byEmail.get().getId();
            }
        }
        if (userId != null) {
            Optional<Employee> byUser = employeeRepository.findByUserId(userId);
            if (byUser.isPresent()) {
                return byUser.get().getId();
            }
        }
        return null;
    }

    private boolean canAccessNotification(Notification n, Long currentUserId, Long linkedEmployeeId) {
        if (currentUserId == null) return false;
        // Broadcast
        if (n.getUser() == null && n.getEmployee() == null) {
            return true;
        }
        // Targeted to user
        if (n.getUser() != null && n.getUser().getId().equals(currentUserId)) {
            return true;
        }
        // Targeted to employee
        if (n.getEmployee() != null && linkedEmployeeId != null && n.getEmployee().getId().equals(linkedEmployeeId)) {
            return true;
        }
        return false;
    }
}
