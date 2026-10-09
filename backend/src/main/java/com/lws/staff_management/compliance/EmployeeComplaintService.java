package com.lws.staff_management.compliance;

import com.lws.staff_management.compliance.dto.ComplaintResponseRequest;
import com.lws.staff_management.compliance.dto.CreateComplaintRequest;
import com.lws.staff_management.compliance.dto.UpdateComplaintStatusRequest;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.notification.Notification;
import com.lws.staff_management.notification.NotificationRepository;
import com.lws.staff_management.user.User;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;

@Service
@Transactional
public class EmployeeComplaintService {

    public static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "Workplace Issues",
            "Salary / Payroll",
            "Leave Problems",
            "Harassment / Misconduct",
            "Policy Violations",
            "Other"
    );

    public static final Set<String> ALLOWED_STATUSES = Set.of(
            "PENDING",
            "IN_PROGRESS",
            "RESOLVED",
            "REJECTED"
    );

    private final EmployeeComplaintRepository complaintRepository;
    private final NotificationPublisher notificationPublisher;

    public EmployeeComplaintService(EmployeeComplaintRepository complaintRepository,
                                    NotificationPublisher notificationPublisher) {
        this.complaintRepository = complaintRepository;
        this.notificationPublisher = notificationPublisher;
    }

    public EmployeeComplaint createComplaint(Employee employee, CreateComplaintRequest request) {
        if (employee == null) {
            throw new BadRequestException("Employee information is required to submit a complaint.");
        }
        if (request == null) {
            throw new BadRequestException("Complaint request body cannot be empty.");
        }

        String title = request.getTitle() != null ? request.getTitle().trim() : "";
        if (title.isEmpty()) {
            throw new BadRequestException("Complaint title is required.");
        }
        if (title.length() > 200) {
            throw new BadRequestException("Complaint title cannot exceed 200 characters.");
        }

        String category = request.getCategory() != null ? request.getCategory().trim() : "";
        if (category.isEmpty()) {
            throw new BadRequestException("Complaint category is required.");
        }
        if (!ALLOWED_CATEGORIES.contains(category)) {
            throw new BadRequestException("Invalid category: " + category + ". Allowed: " + ALLOWED_CATEGORIES);
        }

        String description = request.getDescription() != null ? request.getDescription().trim() : "";
        if (description.isEmpty()) {
            throw new BadRequestException("Complaint description is required.");
        }
        if (description.length() > 4000) {
            throw new BadRequestException("Complaint description cannot exceed 4000 characters.");
        }

        EmployeeComplaint complaint = new EmployeeComplaint(employee, title, category, description);
        EmployeeComplaint saved = complaintRepository.save(complaint);

        // Targeted confirmation notification for the employee via Observer publisher
        notificationPublisher.publish(NotificationEvent.targeted(
                employee,
                employee.getUser(),
                "Complaint Submitted: " + saved.getComplaintCode(),
                "Your complaint '" + saved.getTitle() + "' has been logged with HR under status PENDING.",
                "COMPLIANCE",
                "/employee/complaints"
        ));

        return saved;
    }

    public List<EmployeeComplaint> getMyComplaints(Long employeeId) {
        if (employeeId == null) {
            return List.of();
        }
        return complaintRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    public EmployeeComplaint getMyComplaintById(Long complaintId, Long employeeId) {
        EmployeeComplaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        if (complaint.getEmployee() == null || !complaint.getEmployee().getId().equals(employeeId)) {
            throw new AccessDeniedException("Access denied: You may only view your own complaints.");
        }
        return complaint;
    }

    public List<EmployeeComplaint> getAllComplaints(String status, String category, String search) {
        String cleanStatus = (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL"))
                ? status.trim().toUpperCase() : null;
        String cleanCat = (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("ALL"))
                ? category.trim() : null;
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        return complaintRepository.searchComplaints(cleanStatus, cleanCat, cleanSearch);
    }

    public EmployeeComplaint getComplaintById(Long complaintId) {
        return complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
    }

    public EmployeeComplaint updateStatus(Long complaintId, UpdateComplaintStatusRequest request, User adminUser) {
        if (request == null || request.getStatus() == null || request.getStatus().trim().isEmpty()) {
            throw new BadRequestException("Status is required.");
        }
        String status = request.getStatus().trim().toUpperCase();
        if (!ALLOWED_STATUSES.contains(status)) {
            throw new BadRequestException("Invalid status: " + status + ". Allowed: " + ALLOWED_STATUSES);
        }

        EmployeeComplaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        complaint.setStatus(status);
        complaint.setUpdatedAt(LocalDateTime.now());
        if (adminUser != null) {
            complaint.setHandledBy(adminUser);
        }
        if ("RESOLVED".equals(status) || "REJECTED".equals(status)) {
            complaint.setResolvedAt(LocalDateTime.now());
        }

        EmployeeComplaint saved = complaintRepository.save(complaint);

        // Targeted notification to employee about status change via Observer publisher
        if (saved.getEmployee() != null) {
            notificationPublisher.publish(NotificationEvent.targeted(
                    saved.getEmployee(),
                    saved.getEmployee().getUser(),
                    "Complaint Status Update: " + saved.getComplaintCode(),
                    "The status of your complaint '" + saved.getTitle() + "' has been changed to " + status + ".",
                    "COMPLIANCE",
                    "/employee/complaints"
            ));
        }

        return saved;
    }

    public EmployeeComplaint submitAdminResponse(Long complaintId, ComplaintResponseRequest request, User adminUser) {
        if (request == null || request.getAdminResponse() == null || request.getAdminResponse().trim().isEmpty()) {
            throw new BadRequestException("Admin response text cannot be empty.");
        }

        EmployeeComplaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        complaint.setAdminResponse(request.getAdminResponse().trim());
        complaint.setUpdatedAt(LocalDateTime.now());
        if (adminUser != null) {
            complaint.setHandledBy(adminUser);
        }

        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            String newStatus = request.getStatus().trim().toUpperCase();
            if (ALLOWED_STATUSES.contains(newStatus)) {
                complaint.setStatus(newStatus);
                if ("RESOLVED".equals(newStatus) || "REJECTED".equals(newStatus)) {
                    complaint.setResolvedAt(LocalDateTime.now());
                }
            }
        }

        EmployeeComplaint saved = complaintRepository.save(complaint);

        // Targeted notification to employee with response update via Observer publisher
        if (saved.getEmployee() != null) {
            notificationPublisher.publish(NotificationEvent.targeted(
                    saved.getEmployee(),
                    saved.getEmployee().getUser(),
                    "Official HR Response: " + saved.getComplaintCode(),
                    "HR Management has responded to your complaint: '" + saved.getTitle() + "'.",
                    "COMPLIANCE",
                    "/employee/complaints"
            ));
        }

        return saved;
    }
}
