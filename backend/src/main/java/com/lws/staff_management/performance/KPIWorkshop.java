package com.lws.staff_management.performance;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "kpi_workshops")
public class KPIWorkshop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_id", nullable = false, unique = true)
    @JsonIgnore
    private KPI kpi;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "workshop_date")
    private LocalDate workshopDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(length = 200)
    private String location;

    @Column(length = 150)
    private String trainer;

    @Column(name = "max_score", precision = 10, scale = 2)
    private BigDecimal maxScore = BigDecimal.valueOf(100);

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(length = 30)
    private String status = "SCHEDULED"; // SCHEDULED, COMPLETED, CANCELLED

    public KPIWorkshop() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public KPI getKpi() { return kpi; }
    public void setKpi(KPI kpi) { this.kpi = kpi; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getWorkshopDate() { return workshopDate; }
    public void setWorkshopDate(LocalDate workshopDate) { this.workshopDate = workshopDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getTrainer() { return trainer; }
    public void setTrainer(String trainer) { this.trainer = trainer; }

    public BigDecimal getMaxScore() { return maxScore; }
    public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
