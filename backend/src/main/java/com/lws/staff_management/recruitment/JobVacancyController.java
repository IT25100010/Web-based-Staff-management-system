package com.lws.staff_management.recruitment;

import com.lws.staff_management.employee.Department;
import com.lws.staff_management.employee.DepartmentRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recruitment/vacancies")
public class JobVacancyController {

    private final JobVacancyRepository vacancyRepository;
    private final DepartmentRepository departmentRepository;

    public JobVacancyController(JobVacancyRepository vacancyRepository, DepartmentRepository departmentRepository) {
        this.vacancyRepository = vacancyRepository;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping
    public ResponseEntity<List<JobVacancy>> getAllVacancies(@RequestParam(required = false) String status,
                                                            @RequestParam(required = false) Long departmentId,
                                                            @RequestParam(required = false) String search) {
        List<JobVacancy> list = vacancyRepository.findAll();
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            list = list.stream().filter(v -> status.equalsIgnoreCase(v.getStatus())).toList();
        }
        if (departmentId != null) {
            list = list.stream().filter(v -> v.getDepartment() != null && v.getDepartment().getId().equals(departmentId)).toList();
        }
        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            list = list.stream().filter(v -> (v.getJobTitle() != null && v.getJobTitle().toLowerCase().contains(q))
                    || (v.getVacancyCode() != null && v.getVacancyCode().toLowerCase().contains(q))).toList();
        }
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVacancy(@PathVariable Long id) {
        JobVacancy vacancy = vacancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vacancy not found with id: " + id));
        vacancyRepository.delete(vacancy);
        return ResponseEntity.ok(Map.of("message", "Job vacancy deleted successfully.", "id", id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobVacancy> getVacancyById(@PathVariable Long id) {
        JobVacancy vacancy = vacancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vacancy not found with id: " + id));
        return ResponseEntity.ok(vacancy);
    }

    @PostMapping
    public ResponseEntity<?> createVacancy(@RequestBody Map<String, Object> payload) {
        String jobTitle = (String) payload.get("jobTitle");
        Long deptId = Long.valueOf(payload.get("departmentId").toString());

        if (jobTitle == null || payload.get("openingDate") == null || payload.get("closingDate") == null) {
            throw new BadRequestException("Job title, opening date, and closing date are required.");
        }

        Department department = departmentRepository.findById(deptId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + deptId));

        JobVacancy vacancy = new JobVacancy();
        vacancy.setVacancyCode("VAC-" + System.currentTimeMillis() % 100000);
        vacancy.setJobTitle(jobTitle);
        vacancy.setDepartment(department);
        vacancy.setPositionsCount(Integer.parseInt(payload.getOrDefault("positionsCount", 1).toString()));
        vacancy.setDescription((String) payload.get("description"));
        vacancy.setRequirements((String) payload.get("requirements"));
        vacancy.setOpeningDate(LocalDate.parse(payload.get("openingDate").toString()));
        vacancy.setClosingDate(LocalDate.parse(payload.get("closingDate").toString()));
        vacancy.setStatus((String) payload.getOrDefault("status", "OPEN"));

        JobVacancy saved = vacancyRepository.save(vacancy);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateVacancy(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        JobVacancy vacancy = vacancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vacancy not found with id: " + id));

        if (payload.containsKey("jobTitle")) vacancy.setJobTitle((String) payload.get("jobTitle"));
        if (payload.containsKey("description")) vacancy.setDescription((String) payload.get("description"));
        if (payload.containsKey("requirements")) vacancy.setRequirements((String) payload.get("requirements"));
        if (payload.containsKey("positionsCount")) {
            vacancy.setPositionsCount(Integer.parseInt(payload.get("positionsCount").toString()));
        }
        if (payload.containsKey("status")) vacancy.setStatus((String) payload.get("status"));
        if (payload.containsKey("closingDate")) {
            vacancy.setClosingDate(LocalDate.parse(payload.get("closingDate").toString()));
        }

        return ResponseEntity.ok(vacancyRepository.save(vacancy));
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<?> closeVacancy(@PathVariable Long id) {
        JobVacancy vacancy = vacancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vacancy not found with id: " + id));
        vacancy.setStatus("CLOSED");
        return ResponseEntity.ok(vacancyRepository.save(vacancy));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("total", vacancyRepository.count());
        summary.put("open", vacancyRepository.countByStatus("OPEN"));
        summary.put("closed", vacancyRepository.countByStatus("CLOSED"));
        summary.put("draft", vacancyRepository.countByStatus("DRAFT"));
        return ResponseEntity.ok(summary);
    }
}
