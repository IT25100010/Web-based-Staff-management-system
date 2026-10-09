package com.lws.staff_management.notification.publisher;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.observer.NotificationObserver;
import com.lws.staff_management.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Subject / Publisher in the Observer Design Pattern.
 * Manages observers and dispatches NotificationEvents to all registered observers.
 */
@Component
public class NotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationPublisher.class);

    private final List<NotificationObserver> observers;

    /**
     * Spring-friendly constructor: Automatically injects all registered NotificationObserver beans.
     */
    public NotificationPublisher(List<NotificationObserver> observers) {
        this.observers = new ArrayList<>(observers != null ? observers : List.of());
        log.info("Initialized NotificationPublisher with {} observer(s)", this.observers.size());
    }

    /**
     * Register a new observer (Observer pattern contract).
     */
    public synchronized void registerObserver(NotificationObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
            log.debug("Registered observer: {}", observer.getClass().getSimpleName());
        }
    }

    /**
     * Remove an observer (Observer pattern contract).
     */
    public synchronized void removeObserver(NotificationObserver observer) {
        if (observer != null) {
            observers.remove(observer);
            log.debug("Removed observer: {}", observer.getClass().getSimpleName());
        }
    }

    /**
     * Core Subject notification dispatch: notifies all observers of the event.
     *
     * @param event the notification event to publish
     */
    public void publish(NotificationEvent event) {
        if (event == null) return;

        for (NotificationObserver observer : observers) {
            try {
                observer.update(event);
            } catch (Exception e) {
                log.error("Error in notification observer {}: {}", observer.getClass().getSimpleName(), e.getMessage(), e);
            }
        }
    }

    // Convenience publisher helper methods
    public void publishTargeted(Employee employee, String title, String message, String type, String link) {
        publish(NotificationEvent.targeted(employee, title, message, type, link));
    }

    public void publishTargeted(Employee employee, User user, String title, String message, String type, String link) {
        publish(NotificationEvent.targeted(employee, user, title, message, type, link));
    }

    public void publishTargeted(User user, String title, String message, String type, String link) {
        publish(NotificationEvent.targeted(user, title, message, type, link));
    }

    public void publishTargeted(Long employeeId, String title, String message, String type, String link) {
        publish(NotificationEvent.targeted(employeeId, title, message, type, link));
    }

    public void publishBroadcast(String title, String message, String type, String link) {
        publish(NotificationEvent.broadcast(title, message, type, link));
    }
}
