package com.lws.staff_management.workforce;

import jakarta.persistence.*;

@Entity
@Table(name = "work_locations")
public class WorkLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "location_code", unique = true, nullable = false, length = 30)
    private String locationCode;

    @Column(name = "location_name", nullable = false, length = 150)
    private String locationName;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "workforce_plan_id")
    private WorkforcePlan workforcePlan;

    @Column(nullable = false)
    private int capacity = 20;

    @Column(length = 30, nullable = false)
    private String status = "ACTIVE"; // ACTIVE, MAINTENANCE, INACTIVE

    public WorkLocation() {}

    public WorkLocation(String locationCode, String locationName, String address, String contactPerson, String contactPhone, int capacity, String status) {
        this.locationCode = locationCode;
        this.locationName = locationName;
        this.address = address;
        this.contactPerson = contactPerson;
        this.contactPhone = contactPhone;
        this.capacity = capacity;
        this.status = status != null ? status : "ACTIVE";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLocationCode() { return locationCode; }
    public void setLocationCode(String locationCode) { this.locationCode = locationCode; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public WorkforcePlan getWorkforcePlan() { return workforcePlan; }
    public void setWorkforcePlan(WorkforcePlan workforcePlan) { this.workforcePlan = workforcePlan; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
