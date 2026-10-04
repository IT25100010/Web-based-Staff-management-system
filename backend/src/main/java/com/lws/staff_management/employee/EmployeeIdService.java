package com.lws.staff_management.employee;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class EmployeeIdService {

    private final DepartmentEmployeeSequenceRepository sequenceRepository;
    private final EmployeeRepository employeeRepository;

    public EmployeeIdService(DepartmentEmployeeSequenceRepository sequenceRepository,
                             EmployeeRepository employeeRepository) {
        this.sequenceRepository = sequenceRepository;
        this.employeeRepository = employeeRepository;
    }

    /**
     * Atomically generates the next unique Employee ID for the given department:
     * LK + DEPARTMENT_ID + 7-DIGIT SEQUENCE (e.g. LK10000001, LK20000001)
     *
     * @param departmentId ID of the department
     * @return Formatted employee ID
     */
    @Transactional
    public String generateNextEmployeeId(Long departmentId) {
        if (departmentId == null) {
            throw new IllegalArgumentException("Department ID is required for employee ID generation.");
        }

        // 1. Lock/read the sequence row for the selected department inside a transaction
        DepartmentEmployeeSequence seq = sequenceRepository.findByDepartmentIdWithLock(departmentId).orElse(null);

        if (seq == null) {
            // Initialize from existing employees matching new format, or 0 if none exist
            long initialSeq = getHighestExistingSequence(departmentId);
            DepartmentEmployeeSequence newSeq = new DepartmentEmployeeSequence(departmentId, initialSeq);
            try {
                seq = sequenceRepository.saveAndFlush(newSeq);
            } catch (Exception ex) {
                // In case of concurrent race condition, acquire the row with lock
                seq = sequenceRepository.findByDepartmentIdWithLock(departmentId)
                        .orElseThrow(() -> new IllegalStateException("Failed to acquire sequence for department: " + departmentId));
            }
        }

        // 2. Increment sequence
        long nextSeq = seq.getLastSequence() + 1;
        seq.setLastSequence(nextSeq);
        sequenceRepository.saveAndFlush(seq);

        // 3. Generate LK + departmentId + 7-digit sequence
        String generatedEmployeeId = String.format("LK%d%07d", departmentId, nextSeq);

        // Safety fallback: if an ID was previously inserted out of sequence, advance until unique
        while (employeeRepository.existsByEmployeeId(generatedEmployeeId)) {
            nextSeq++;
            seq.setLastSequence(nextSeq);
            sequenceRepository.saveAndFlush(seq);
            generatedEmployeeId = String.format("LK%d%07d", departmentId, nextSeq);
        }

        return generatedEmployeeId;
    }

    /**
     * Inspects existing employee IDs for a department to find the highest sequence
     * matching the new format: LK + departmentId + 7-digit sequence.
     * Legacy IDs or non-matching patterns are ignored.
     *
     * @param departmentId ID of the department
     * @return highest existing 7-digit sequence, or 0 if none exist
     */
    public long getHighestExistingSequence(Long departmentId) {
        List<Employee> employees = employeeRepository.findByDepartmentId(departmentId);
        Pattern pattern = Pattern.compile("^LK" + departmentId + "(\\d{7})$", Pattern.CASE_INSENSITIVE);

        long maxSequence = 0L;
        for (Employee emp : employees) {
            String empId = emp.getEmployeeId();
            if (empId != null) {
                Matcher matcher = pattern.matcher(empId.trim());
                if (matcher.matches()) {
                    try {
                        long seqVal = Long.parseLong(matcher.group(1));
                        if (seqVal > maxSequence) {
                            maxSequence = seqVal;
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return maxSequence;
    }
}
