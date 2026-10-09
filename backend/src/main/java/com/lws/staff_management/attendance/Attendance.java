package com.lws.staff_management.attendance;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.workforce.Shift;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "attendances", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "attendance_date"})
})
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "check_in_time")
    private LocalTime checkInTime;

    @Column(name = "check_out_time")
    private LocalTime checkOutTime;

    @Column(name = "working_hours", precision = 4, scale = 2)
    private BigDecimal workingHours = BigDecimal.ZERO;

    @Column(name = "regular_hours", precision = 4, scale = 2)
    private BigDecimal regularHours = BigDecimal.ZERO;

    @Column(name = "ot_hours", precision = 4, scale = 2)
    private BigDecimal otHours = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "PRESENT"; // PRESENT, ABSENT, LATE, LEAVE, EARLY_LEAVE

    @Column(length = 255)
    private String notes;

    public Attendance() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public Shift getShift() { return shift; }
    public void setShift(Shift shift) { this.shift = shift; }

    public LocalDate getAttendanceDate() { return attendanceDate; }
    public void setAttendanceDate(LocalDate attendanceDate) { this.attendanceDate = attendanceDate; }

    public LocalTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalTime checkInTime) { this.checkInTime = checkInTime; }

    public LocalTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(LocalTime checkOutTime) { this.checkOutTime = checkOutTime; }

    public BigDecimal getWorkingHours() { return workingHours; }
    public void setWorkingHours(BigDecimal workingHours) { this.workingHours = workingHours; }

    public BigDecimal getRegularHours() { return regularHours != null ? regularHours : BigDecimal.ZERO; }
    public void setRegularHours(BigDecimal regularHours) { this.regularHours = regularHours; }

    public BigDecimal getOtHours() { return otHours != null ? otHours : BigDecimal.ZERO; }
    public void setOtHours(BigDecimal otHours) { this.otHours = otHours; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    @Transient
    public String getTotalWorkedFormatted() {
        if (workingHours == null) return "0h 00m";
        long totalMin = workingHours.multiply(BigDecimal.valueOf(60)).longValue();
        long h = totalMin / 60;
        long m = totalMin % 60;
        return h + "h " + (m < 10 ? "0" + m : m) + "m";
    }

    @Transient
    public String getRegularHoursFormatted() {
        if (regularHours == null) return "0h 00m";
        long totalMin = regularHours.multiply(BigDecimal.valueOf(60)).longValue();
        long h = totalMin / 60;
        long m = totalMin % 60;
        return h + "h " + (m < 10 ? "0" + m : m) + "m";
    }

    @Transient
    public String getOtHoursFormatted() {
        if (otHours == null || otHours.compareTo(BigDecimal.ZERO) <= 0) return "0h 00m";
        long totalMin = otHours.multiply(BigDecimal.valueOf(60)).longValue();
        long h = totalMin / 60;
        long m = totalMin % 60;
        return h + "h " + (m < 10 ? "0" + m : m) + "m";
    }

    @Transient
    public BigDecimal getPotentialOtAmount() {
        if (otHours == null || otHours.compareTo(BigDecimal.ZERO) <= 0 || employee == null || employee.getPosition() == null || employee.getPosition().getOtRatePerHour() == null) {
            return BigDecimal.ZERO;
        }
        return otHours.multiply(employee.getPosition().getOtRatePerHour()).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
