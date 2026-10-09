package com.lws.staff_management.notification.event;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.user.User;

/**
 * Reusable event model for the Observer Design Pattern in the notification subsystem.
 * Represents a business event that requires notification delivery.
 */
public class NotificationEvent {

    private final Long userId;
    private final Long employeeId;
    private final User user;
    private final Employee employee;
    private final String title;
    private final String message;
    private final String type;
    private final String link;
    private final boolean broadcast;

    public NotificationEvent(Long employeeId, Long userId, Employee employee, User user,
                             String title, String message, String type, String link, boolean broadcast) {
        this.employeeId = employeeId != null ? employeeId : (employee != null ? employee.getId() : null);
        this.userId = userId != null ? userId : (user != null ? user.getId() : null);
        this.employee = employee;
        this.user = user;
        this.title = title;
        this.message = message;
        this.type = type != null ? type : "INFO";
        this.link = link;
        this.broadcast = broadcast;
    }

    public static NotificationEvent targeted(Employee employee, String title, String message, String type, String link) {
        return new NotificationEvent(employee != null ? employee.getId() : null, null, employee, null, title, message, type, link, false);
    }

    public static NotificationEvent targeted(Employee employee, User user, String title, String message, String type, String link) {
        return new NotificationEvent(
                employee != null ? employee.getId() : null,
                user != null ? user.getId() : null,
                employee,
                user,
                title,
                message,
                type,
                link,
                false
        );
    }

    public static NotificationEvent targeted(User user, String title, String message, String type, String link) {
        return new NotificationEvent(null, user != null ? user.getId() : null, null, user, title, message, type, link, false);
    }

    public static NotificationEvent targeted(Long employeeId, String title, String message, String type, String link) {
        return new NotificationEvent(employeeId, null, null, null, title, message, type, link, false);
    }

    public static NotificationEvent broadcast(String title, String message, String type, String link) {
        return new NotificationEvent(null, null, null, null, title, message, type, link, true);
    }

    public Long getUserId() { return userId; }
    public Long getEmployeeId() { return employeeId; }
    public User getUser() { return user; }
    public Employee getEmployee() { return employee; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getType() { return type; }
    public String getLink() { return link; }
    public boolean isBroadcast() { return broadcast; }
}
