package com.lws.staff_management.notification.observer;

import com.lws.staff_management.notification.event.NotificationEvent;

/**
 * Observer interface in the Observer Design Pattern for notifications.
 * Subscribers implement this contract to handle notification events dispatched by the Subject/Publisher.
 */
public interface NotificationObserver {

    /**
     * Called by the Subject/Publisher when a notification event is published.
     *
     * @param event the notification event containing targeting and message metadata
     */
    void update(NotificationEvent event);
}
