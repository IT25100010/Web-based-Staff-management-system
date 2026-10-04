package com.lws.staff_management.employee;

import jakarta.persistence.*;

@Entity
@Table(name = "positions")
public class Position {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(length = 255)
    private String description;

    @Column(length = 50)
    private String level = "Intermediate"; // Entry, Junior, Intermediate, Senior, Lead, Executive

    @Column(name = "default_monthly_salary", precision = 12, scale = 2)
    private java.math.BigDecimal defaultMonthlySalary;

    @Column(name = "ot_rate_per_hour", precision = 10, scale = 2)
    private java.math.BigDecimal otRatePerHour = java.math.BigDecimal.ZERO;

    @Column(name = "regular_working_hours_per_day")
    private Double regularWorkingHoursPerDay = 8.0;

    public Position() {}

    public Position(String title, Department department, String description) {
        this.title = title;
        this.department = department;
        this.description = description;
        this.level = "Intermediate";
        this.regularWorkingHoursPerDay = 8.0;
        this.otRatePerHour = java.math.BigDecimal.ZERO;
    }

    public Position(String title, Department department, String description, String level) {
        this.title = title;
        this.department = department;
        this.description = description;
        this.level = level != null ? level : "Intermediate";
        this.regularWorkingHoursPerDay = 8.0;
        this.otRatePerHour = java.math.BigDecimal.ZERO;
    }

    public Position(String title, Department department, String description, String level, java.math.BigDecimal defaultMonthlySalary) {
        this.title = title;
        this.department = department;
        this.description = description;
        this.level = level != null ? level : "Intermediate";
        this.defaultMonthlySalary = defaultMonthlySalary;
        this.regularWorkingHoursPerDay = 8.0;
        this.otRatePerHour = java.math.BigDecimal.ZERO;
    }

    public Position(String title, Department department, String description, String level, java.math.BigDecimal defaultMonthlySalary, java.math.BigDecimal otRatePerHour, Double regularWorkingHoursPerDay) {
        this.title = title;
        this.department = department;
        this.description = description;
        this.level = level != null ? level : "Intermediate";
        this.defaultMonthlySalary = defaultMonthlySalary;
        this.otRatePerHour = otRatePerHour != null ? otRatePerHour : java.math.BigDecimal.ZERO;
        this.regularWorkingHoursPerDay = regularWorkingHoursPerDay != null ? regularWorkingHoursPerDay : 8.0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public java.math.BigDecimal getDefaultMonthlySalary() { return defaultMonthlySalary; }
    public void setDefaultMonthlySalary(java.math.BigDecimal defaultMonthlySalary) { this.defaultMonthlySalary = defaultMonthlySalary; }

    public java.math.BigDecimal getOtRatePerHour() { return otRatePerHour != null ? otRatePerHour : java.math.BigDecimal.ZERO; }
    public void setOtRatePerHour(java.math.BigDecimal otRatePerHour) { this.otRatePerHour = otRatePerHour != null ? otRatePerHour : java.math.BigDecimal.ZERO; }

    public Double getRegularWorkingHoursPerDay() { return regularWorkingHoursPerDay != null ? regularWorkingHoursPerDay : 8.0; }
    public void setRegularWorkingHoursPerDay(Double regularWorkingHoursPerDay) { this.regularWorkingHoursPerDay = regularWorkingHoursPerDay != null ? regularWorkingHoursPerDay : 8.0; }
}
