package com.lws.staff_management.recruitment;

import com.lws.staff_management.employee.Department;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "job_vacancies")
public class JobVacancy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vacancy_code", unique = true, nullable = false, length = 50)
    private String vacancyCode;

    @Column(name = "job_title", nullable = false, length = 150)
    private String jobTitle;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(name = "positions_count", nullable = false)
    private int positionsCount = 1;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "opening_date", nullable = false)
    private LocalDate openingDate;

    @Column(name = "closing_date", nullable = false)
    private LocalDate closingDate;

    @Column(length = 30, nullable = false)
    private String status = "OPEN"; // OPEN, CLOSED, DRAFT

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public JobVacancy() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVacancyCode() { return vacancyCode; }
    public void setVacancyCode(String vacancyCode) { this.vacancyCode = vacancyCode; }

    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }

    public int getPositionsCount() { return positionsCount; }
    public void setPositionsCount(int positionsCount) { this.positionsCount = positionsCount; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }

    public LocalDate getOpeningDate() { return openingDate; }
    public void setOpeningDate(LocalDate openingDate) { this.openingDate = openingDate; }

    public LocalDate getClosingDate() { return closingDate; }
    public void setClosingDate(LocalDate closingDate) { this.closingDate = closingDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
