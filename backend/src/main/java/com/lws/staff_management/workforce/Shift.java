package com.lws.staff_management.workforce;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "shifts")
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shift_code", unique = true, nullable = false, length = 50)
    private String shiftCode;

    @Column(name = "shift_name", nullable = false, length = 100)
    private String shiftName;

    @Column(name = "shift_date", nullable = false)
    private LocalDate shiftDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "work_location_id", nullable = false)
    private WorkLocation workLocation;

    @Column(name = "required_employees", nullable = false)
    private int requiredEmployees = 5;

    @Column(length = 30, nullable = false)
    private String status = "SCHEDULED"; // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED

    public Shift() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getShiftCode() { return shiftCode; }
    public void setShiftCode(String shiftCode) { this.shiftCode = shiftCode; }

    public String getShiftName() { return shiftName; }
    public void setShiftName(String shiftName) { this.shiftName = shiftName; }

    public LocalDate getShiftDate() { return shiftDate; }
    public void setShiftDate(LocalDate shiftDate) { this.shiftDate = shiftDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public WorkLocation getWorkLocation() { return workLocation; }
    public void setWorkLocation(WorkLocation workLocation) { this.workLocation = workLocation; }

    public int getRequiredEmployees() { return requiredEmployees; }
    public void setRequiredEmployees(int requiredEmployees) { this.requiredEmployees = requiredEmployees; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
