package com.lws.staff_management.payroll;

import com.lws.staff_management.attendance.Attendance;
import com.lws.staff_management.attendance.AttendanceRepository;
import com.lws.staff_management.attendance.LeaveRequest;
import com.lws.staff_management.attendance.LeaveRequestRepository;
import com.lws.staff_management.attendance.OvertimeRecord;
import com.lws.staff_management.attendance.OvertimeRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;

@RestController
@RequestMapping("/api/payroll")
public class PayrollController {

    private final EmployeeBenefitRepository benefitRepository;
    private final PayrollRepository payrollRepository;
    private final PayrollDetailRepository detailRepository;
    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final OvertimeRepository overtimeRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final NotificationPublisher notificationPublisher;

    public PayrollController(EmployeeBenefitRepository benefitRepository,
                             PayrollRepository payrollRepository,
                             PayrollDetailRepository detailRepository,
                             PayslipRepository payslipRepository,
                             EmployeeRepository employeeRepository,
                             OvertimeRepository overtimeRepository,
                             UserRepository userRepository,
                             AttendanceRepository attendanceRepository,
                             LeaveRequestRepository leaveRequestRepository,
                             NotificationPublisher notificationPublisher) {
        this.benefitRepository = benefitRepository;
        this.payrollRepository = payrollRepository;
        this.detailRepository = detailRepository;
        this.payslipRepository = payslipRepository;
        this.employeeRepository = employeeRepository;
        this.overtimeRepository = overtimeRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.notificationPublisher = notificationPublisher;
    }

    // Employee Benefits
    @GetMapping("/benefits")
    public ResponseEntity<List<EmployeeBenefit>> getBenefits(@RequestParam(required = false) Long employeeId,
                                                             @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(benefitRepository.findByEmployeeId(myEmpId));
        }

        if (employeeId != null) {
            return ResponseEntity.ok(benefitRepository.findByEmployeeId(employeeId));
        }
        return ResponseEntity.ok(benefitRepository.findAll());
    }

    @GetMapping("/benefits/{id}")
    public ResponseEntity<EmployeeBenefit> getBenefitById(@PathVariable Long id,
                                                          @AuthenticationPrincipal UserPrincipal currentUser) {
        EmployeeBenefit benefit = benefitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Benefit not found: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || benefit.getEmployee() == null || !myEmpId.equals(benefit.getEmployee().getId())) {
                throw new AccessDeniedException("Access denied: You may only view your own benefits.");
            }
        }

        return ResponseEntity.ok(benefit);
    }

    @PostMapping("/benefits")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> addBenefit(@RequestBody Map<String, Object> payload) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        EmployeeBenefit benefit = new EmployeeBenefit();
        benefit.setEmployee(employee);
        benefit.setBenefitType((String) payload.get("benefitType"));
        benefit.setAmount(new BigDecimal(payload.get("amount").toString()));
        benefit.setFrequency((String) payload.getOrDefault("frequency", "MONTHLY"));
        benefit.setEffectiveDate(LocalDate.parse(payload.get("effectiveDate").toString()));
        benefit.setStatus((String) payload.getOrDefault("status", "ACTIVE"));

        return ResponseEntity.ok(benefitRepository.save(benefit));
    }

    @PutMapping("/benefits/{id}")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateBenefit(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        EmployeeBenefit benefit = benefitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Benefit not found: " + id));

        if (payload.containsKey("benefitType")) benefit.setBenefitType((String) payload.get("benefitType"));
        if (payload.containsKey("amount")) benefit.setAmount(new BigDecimal(payload.get("amount").toString()));
        if (payload.containsKey("frequency")) benefit.setFrequency((String) payload.get("frequency"));
        if (payload.containsKey("effectiveDate")) benefit.setEffectiveDate(LocalDate.parse(payload.get("effectiveDate").toString()));
        if (payload.containsKey("status")) benefit.setStatus((String) payload.get("status"));

        return ResponseEntity.ok(benefitRepository.save(benefit));
    }

    @DeleteMapping("/benefits/{id}")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteBenefit(@PathVariable Long id) {
        EmployeeBenefit benefit = benefitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Benefit not found: " + id));
        benefitRepository.delete(benefit);
        return ResponseEntity.ok(Map.of("message", "Benefit deleted successfully."));
    }

    // Payroll Cycles & Processing
    @GetMapping("/payrolls")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<List<Payroll>> getPayrolls() {
        return ResponseEntity.ok(payrollRepository.findAllByOrderByPayrollYearDescPayrollMonthDesc());
    }

    @GetMapping("/payrolls/{id}")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<Payroll> getPayrollById(@PathVariable Long id) {
        Payroll payroll = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll cycle not found: " + id));
        return ResponseEntity.ok(payroll);
    }

    /**
     * Preview payroll calculations for a given month and year without saving anything to the database.
     */
    @PostMapping("/preview")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> previewPayroll(@RequestBody Map<String, Object> payload) {
        int month = Integer.parseInt(payload.get("month").toString());
        int year = Integer.parseInt(payload.get("year").toString());
        String periodName = (String) payload.getOrDefault("periodName", "Month " + month + ", " + year);

        List<Employee> activeEmployees = employeeRepository.findByEmploymentStatus("Active");
        if (activeEmployees.isEmpty()) {
            throw new BadRequestException("No active employees found to preview payroll.");
        }

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        int expectedWorkingDays = calculateExpectedWorkingDays(startDate, endDate);

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalOvertime = BigDecimal.ZERO;
        BigDecimal totalDeductions = BigDecimal.ZERO;
        BigDecimal totalAttendanceDeductions = BigDecimal.ZERO;

        List<Map<String, Object>> previewDetails = new ArrayList<>();

        for (Employee emp : activeEmployees) {
            CalculatedPayrollItem item = calculateEmployeePayroll(emp, startDate, endDate, expectedWorkingDays);

            totalGross = totalGross.add(item.grossSalary);
            totalNet = totalNet.add(item.netSalary);
            totalOvertime = totalOvertime.add(item.overtimePay);
            totalDeductions = totalDeductions.add(item.totalDeductions);
            totalAttendanceDeductions = totalAttendanceDeductions.add(item.attendanceDeduction);

            Map<String, Object> detailMap = new HashMap<>();
            detailMap.put("employeeId", emp.getId());
            detailMap.put("employeeCode", emp.getEmployeeId());
            detailMap.put("employeeName", emp.getFullName());
            detailMap.put("department", emp.getDepartment() != null ? emp.getDepartment().getName() : "-");
            detailMap.put("position", emp.getPosition() != null ? emp.getPosition().getTitle() : "-");
            detailMap.put("baseSalary", item.baseSalary);
            detailMap.put("adjustedBasic", item.adjustedBasic);
            detailMap.put("expectedWorkingDays", item.expectedWorkingDays);
            detailMap.put("dailyRate", item.dailyRate);
            detailMap.put("presentDays", item.presentDays);
            detailMap.put("lateDays", item.lateDays);
            detailMap.put("halfDays", item.halfDays);
            detailMap.put("paidLeaveDays", item.paidLeaveDays);
            detailMap.put("unpaidLeaveDays", item.unpaidLeaveDays);
            detailMap.put("absentDays", item.absentDays);
            detailMap.put("attendanceDeduction", item.attendanceDeduction);
            detailMap.put("regularWorkedHours", item.regularWorkedHours);
            detailMap.put("overtimeHours", item.overtimeHours);
            detailMap.put("otRate", item.otRate);
            detailMap.put("overtimePay", item.overtimePay);
            detailMap.put("allowances", item.allowances);
            detailMap.put("epfEmployee", item.epfEmployee);
            detailMap.put("epfEmployer", item.epfEmployer);
            detailMap.put("etfEmployer", item.etfEmployer);
            detailMap.put("otherDeductions", item.otherDeductions);
            detailMap.put("totalDeductions", item.totalDeductions);
            detailMap.put("grossSalary", item.grossSalary);
            detailMap.put("netSalary", item.netSalary);
            previewDetails.add(detailMap);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("payrollMonth", month);
        response.put("payrollYear", year);
        response.put("periodName", periodName);
        response.put("employeeCount", activeEmployees.size());
        response.put("expectedWorkingDays", expectedWorkingDays);
        response.put("totalGross", totalGross);
        response.put("totalNet", totalNet);
        response.put("totalOvertime", totalOvertime);
        response.put("totalDeductions", totalDeductions);
        response.put("totalAttendanceDeductions", totalAttendanceDeductions);
        response.put("details", previewDetails);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/process")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    @Transactional
    public ResponseEntity<?> processPayroll(@RequestBody Map<String, Object> payload,
                                            @AuthenticationPrincipal UserPrincipal currentUser) {
        int month = Integer.parseInt(payload.get("month").toString());
        int year = Integer.parseInt(payload.get("year").toString());
        String periodName = (String) payload.getOrDefault("periodName", "Month " + month + ", " + year);

        // Check if already processed
        Optional<Payroll> existing = payrollRepository.findByPayrollMonthAndPayrollYear(month, year);
        if (existing.isPresent()) {
            Payroll ex = existing.get();
            if ("FINALIZED".equalsIgnoreCase(ex.getStatus()) || "PAID".equalsIgnoreCase(ex.getStatus())) {
                throw new BadRequestException("Payroll for " + periodName + " is already finalized (" + ex.getStatus() + ") and cannot be regenerated.");
            }
            // Safely delete DRAFT to regenerate cleanly
            deletePayroll(ex.getId());
        }

        List<Employee> activeEmployees = employeeRepository.findByEmploymentStatus("Active");
        if (activeEmployees.isEmpty()) {
            throw new BadRequestException("No active employees found to process payroll.");
        }

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        int expectedWorkingDays = calculateExpectedWorkingDays(startDate, endDate);

        Payroll payroll = new Payroll();
        payroll.setPayrollMonth(month);
        payroll.setPayrollYear(year);
        payroll.setPeriodName(periodName);
        payroll.setStatus("DRAFT");
        payroll.setProcessedDate(LocalDateTime.now());
        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(payroll::setProcessedBy);
        }

        Payroll savedPayroll = payrollRepository.save(payroll);

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalOvertime = BigDecimal.ZERO;
        BigDecimal totalDeductions = BigDecimal.ZERO;

        int seq = 1;
        for (Employee emp : activeEmployees) {
            CalculatedPayrollItem item = calculateEmployeePayroll(emp, startDate, endDate, expectedWorkingDays);

            PayrollDetail detail = new PayrollDetail();
            detail.setPayroll(savedPayroll);
            detail.setEmployee(emp);
            detail.setBaseSalary(item.baseSalary);
            detail.setExpectedWorkingDays(item.expectedWorkingDays);
            detail.setDailyRate(item.dailyRate);
            detail.setPresentDays(item.presentDays);
            detail.setLateDays(item.lateDays);
            detail.setHalfDays(item.halfDays);
            detail.setPaidLeaveDays(item.paidLeaveDays);
            detail.setUnpaidLeaveDays(item.unpaidLeaveDays);
            detail.setAbsentDays(item.absentDays);
            detail.setAttendanceDeduction(item.attendanceDeduction);
            detail.setRegularWorkedHours(item.regularWorkedHours);
            detail.setOvertimeHours(item.overtimeHours);
            detail.setOtRate(item.otRate);
            detail.setOvertimePay(item.overtimePay);
            detail.setAllowances(item.allowances);
            detail.setEpfEmployee(item.epfEmployee);
            detail.setEpfEmployer(item.epfEmployer);
            detail.setEtfEmployer(item.etfEmployer);
            detail.setOtherDeductions(item.otherDeductions);
            detail.setTotalDeductions(item.totalDeductions);
            detail.setGrossSalary(item.grossSalary);
            detail.setNetSalary(item.netSalary);

            PayrollDetail savedDetail = detailRepository.save(detail);

            // Create Payslip (draft until cycle finalized)
            Payslip payslip = new Payslip();
            payslip.setPayslipNumber(String.format("PAY-%d%02d-%03d", year, month, seq++));
            payslip.setEmployee(emp);
            payslip.setPayrollDetail(savedDetail);
            payslip.setPeriodName(periodName);
            payslip.setIssueDate(LocalDate.now());
            payslip.setStatus("DRAFT");
            payslipRepository.save(payslip);

            totalGross = totalGross.add(item.grossSalary);
            totalNet = totalNet.add(item.netSalary);
            totalOvertime = totalOvertime.add(item.overtimePay);
            totalDeductions = totalDeductions.add(item.totalDeductions);
        }

        savedPayroll.setTotalGross(totalGross);
        savedPayroll.setTotalNet(totalNet);
        savedPayroll.setTotalOvertime(totalOvertime);
        savedPayroll.setTotalDeductions(totalDeductions);
        savedPayroll.setEmployeeCount(activeEmployees.size());

        return ResponseEntity.ok(payrollRepository.save(savedPayroll));
    }

    @PutMapping("/payrolls/{id}/finalize")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    @Transactional
    public ResponseEntity<?> finalizePayroll(@PathVariable Long id,
                                             @AuthenticationPrincipal UserPrincipal currentUser) {
        Payroll payroll = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll cycle not found: " + id));

        payroll.setStatus("FINALIZED");
        payroll.setProcessedDate(LocalDateTime.now());
        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(payroll::setProcessedBy);
        }

        List<PayrollDetail> details = detailRepository.findByPayrollId(id);
        for (PayrollDetail d : details) {
            payslipRepository.findAll().stream()
                    .filter(p -> p.getPayrollDetail() != null && p.getPayrollDetail().getId().equals(d.getId()))
                    .forEach(p -> {
                        p.setStatus("FINALIZED");
                        payslipRepository.save(p);
                    });

            // Step 8: Send targeted notification to the employee whose payslip is ready
            if (d.getEmployee() != null) {
                notificationPublisher.publish(NotificationEvent.targeted(
                        d.getEmployee(),
                        "Payslip Available",
                        "Your payslip for " + payroll.getPeriodName() + " is now available.",
                        "SUCCESS",
                        "/employee/payslip"
                ));
            }
        }

        return ResponseEntity.ok(payrollRepository.save(payroll));
    }

    @Transactional
    @DeleteMapping("/payrolls/{id}")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> deletePayroll(@PathVariable Long id) {
        Payroll payroll = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll cycle not found: " + id));

        List<PayrollDetail> details = detailRepository.findByPayrollId(id);
        for (PayrollDetail d : details) {
            payslipRepository.findAll().stream()
                    .filter(p -> p.getPayrollDetail() != null && p.getPayrollDetail().getId().equals(d.getId()))
                    .forEach(payslipRepository::delete);
        }
        detailRepository.deleteAll(details);
        payrollRepository.delete(payroll);
        return ResponseEntity.ok(Map.of("message", "Payroll cycle and linked payslips deleted successfully."));
    }

    @GetMapping("/payrolls/{id}/details")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<List<PayrollDetail>> getPayrollDetails(@PathVariable Long id) {
        return ResponseEntity.ok(detailRepository.findByPayrollId(id));
    }

    // Payslips
    @GetMapping("/payslips")
    public ResponseEntity<List<Payslip>> getPayslips(@RequestParam(required = false) Long employeeId,
                                                     @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(payslipRepository.findByEmployeeIdOrderByIssueDateDesc(myEmpId));
        }

        if (employeeId != null) {
            return ResponseEntity.ok(payslipRepository.findByEmployeeIdOrderByIssueDateDesc(employeeId));
        }
        return ResponseEntity.ok(payslipRepository.findAll());
    }

    @GetMapping("/payslips/{id}")
    public ResponseEntity<Payslip> getPayslipById(@PathVariable Long id,
                                                 @AuthenticationPrincipal UserPrincipal currentUser) {
        Payslip payslip = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip not found: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || payslip.getEmployee() == null || !myEmpId.equals(payslip.getEmployee().getId())) {
                throw new AccessDeniedException("Access denied: You may only view your own payslips.");
            }
        }

        return ResponseEntity.ok(payslip);
    }

    @PutMapping("/payslips/{id}/status")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> updatePayslipStatus(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Payslip payslip = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip not found: " + id));

        if (payload.containsKey("status")) {
            payslip.setStatus((String) payload.get("status"));
        }

        return ResponseEntity.ok(payslipRepository.save(payslip));
    }

    // Reports
    @GetMapping("/reports/summary")
    @PreAuthorize("hasAnyRole('FINANCE_EXECUTIVE', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<Map<String, Object>> getPayrollReportSummary() {
        Map<String, Object> summary = new HashMap<>();
        List<Payroll> payrolls = payrollRepository.findAllByOrderByPayrollYearDescPayrollMonthDesc();

        BigDecimal grandGross = payrolls.stream().map(Payroll::getTotalGross).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal grandNet = payrolls.stream().map(Payroll::getTotalNet).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal grandOt = payrolls.stream().map(Payroll::getTotalOvertime).reduce(BigDecimal.ZERO, BigDecimal::add);

        summary.put("totalCycles", payrolls.size());
        summary.put("cumulativeGrossDisbursed", grandGross);
        summary.put("cumulativeNetDisbursed", grandNet);
        summary.put("cumulativeOvertimeDisbursed", grandOt);
        summary.put("payrolls", payrolls);

        return ResponseEntity.ok(summary);
    }

    // Calculation & Security Helpers

    private int calculateExpectedWorkingDays(LocalDate startDate, LocalDate endDate) {
        int expectedWorkingDays = 0;
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            java.time.DayOfWeek dow = cur.getDayOfWeek();
            if (dow != java.time.DayOfWeek.SATURDAY && dow != java.time.DayOfWeek.SUNDAY) {
                expectedWorkingDays++;
            }
            cur = cur.plusDays(1);
        }
        return expectedWorkingDays > 0 ? expectedWorkingDays : 22;
    }

    private CalculatedPayrollItem calculateEmployeePayroll(Employee emp, LocalDate startDate, LocalDate endDate, int expectedWorkingDays) {
        // 1. Base salary resolution: Employee base salary takes precedence; fallback to Position defaultMonthlySalary; else throw BadRequestException
        BigDecimal base;
        if (emp.getBaseSalary() != null && emp.getBaseSalary().compareTo(BigDecimal.ZERO) > 0) {
            base = emp.getBaseSalary();
        } else if (emp.getPosition() != null && emp.getPosition().getDefaultMonthlySalary() != null && emp.getPosition().getDefaultMonthlySalary().compareTo(BigDecimal.ZERO) > 0) {
            base = emp.getPosition().getDefaultMonthlySalary();
        } else {
            throw new BadRequestException("Salary configuration error: Employee " + emp.getFullName() + " (" + emp.getEmployeeId() + ") has no base salary and position has no default monthly salary configured.");
        }

        BigDecimal dailyRate = base.divide(BigDecimal.valueOf(expectedWorkingDays), 2, RoundingMode.HALF_UP);

        // 2. Overtime calculation (APPROVED records only)
        List<OvertimeRecord> otList = overtimeRepository.findByEmployeeIdAndOvertimeDateBetween(emp.getId(), startDate, endDate);
        BigDecimal otHours = otList.stream()
                .filter(ot -> "APPROVED".equalsIgnoreCase(ot.getStatus()))
                .map(OvertimeRecord::getHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal otPay = otList.stream()
                .filter(ot -> "APPROVED".equalsIgnoreCase(ot.getStatus()))
                .map(OvertimeRecord::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Benefits / allowances (ACTIVE only and effectiveDate <= endDate)
        List<EmployeeBenefit> benefits = benefitRepository.findByEmployeeId(emp.getId());
        BigDecimal allowances = benefits.stream()
                .filter(b -> "ACTIVE".equalsIgnoreCase(b.getStatus()))
                .filter(b -> b.getEffectiveDate() == null || !b.getEffectiveDate().isAfter(endDate))
                .map(EmployeeBenefit::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 4. Leave & Attendance deductions
        List<LeaveRequest> approvedLeaves = leaveRequestRepository.findApprovedLeavesInPeriod(emp.getId(), startDate, endDate);
        Set<LocalDate> unpaidLeaveDates = new HashSet<>();
        Set<LocalDate> paidLeaveDates = new HashSet<>();

        for (LeaveRequest leave : approvedLeaves) {
            LocalDate start = leave.getStartDate().isBefore(startDate) ? startDate : leave.getStartDate();
            LocalDate end = leave.getEndDate().isAfter(endDate) ? endDate : leave.getEndDate();
            LocalDate cur = start;
            boolean isUnpaid = leave.getLeaveType() != null && (
                    leave.getLeaveType().equalsIgnoreCase("Unpaid") ||
                    leave.getLeaveType().equalsIgnoreCase("No Pay") ||
                    leave.getLeaveType().equalsIgnoreCase("Without Pay"));
            while (!cur.isAfter(end)) {
                java.time.DayOfWeek dow = cur.getDayOfWeek();
                if (dow != java.time.DayOfWeek.SATURDAY && dow != java.time.DayOfWeek.SUNDAY) {
                    if (isUnpaid) {
                        unpaidLeaveDates.add(cur);
                    } else {
                        paidLeaveDates.add(cur);
                    }
                }
                cur = cur.plusDays(1);
            }
        }

        List<Attendance> attendances = attendanceRepository.findByEmployeeIdAndAttendanceDateBetween(emp.getId(), startDate, endDate);
        int presentCount = 0;
        int lateCount = 0;
        int halfDayCount = 0;
        Set<LocalDate> absentDates = new HashSet<>();

        for (Attendance att : attendances) {
            String status = att.getStatus() != null ? att.getStatus().toUpperCase() : "";
            LocalDate attDate = att.getAttendanceDate();
            if (status.equals("PRESENT") || status.equals("ON_TIME")) {
                presentCount++;
            } else if (status.equals("LATE")) {
                lateCount++;
            } else if (status.equals("HALF_DAY")) {
                halfDayCount++;
            } else if (status.equals("ABSENT")) {
                java.time.DayOfWeek dow = attDate.getDayOfWeek();
                if (dow != java.time.DayOfWeek.SATURDAY && dow != java.time.DayOfWeek.SUNDAY) {
                    // Prevent double deduction if date is already marked as unpaid leave
                    if (!unpaidLeaveDates.contains(attDate)) {
                        absentDates.add(attDate);
                    }
                }
            }
        }

        int totalUnpaidLeaveDays = unpaidLeaveDates.size();
        int totalAbsentDays = absentDates.size();
        int totalPaidLeaveDays = paidLeaveDates.size();

        BigDecimal unpaidLeaveDeduction = dailyRate.multiply(BigDecimal.valueOf(totalUnpaidLeaveDays));
        BigDecimal absentDeduction = dailyRate.multiply(BigDecimal.valueOf(totalAbsentDays));
        BigDecimal halfDayDeduction = dailyRate.multiply(new BigDecimal("0.5")).multiply(BigDecimal.valueOf(halfDayCount));
        BigDecimal attendanceDeduction = unpaidLeaveDeduction.add(absentDeduction).add(halfDayDeduction).setScale(2, RoundingMode.HALF_UP);

        BigDecimal otRate = (emp.getPosition() != null && emp.getPosition().getOtRatePerHour() != null)
                ? emp.getPosition().getOtRatePerHour() : BigDecimal.ZERO;

        BigDecimal regularWorkedHours = attendances.stream()
                .map(Attendance::getRegularHours)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 5. Statutory deductions (Sri Lanka EPF / ETF)
        BigDecimal epfEmployee = base.multiply(new BigDecimal("0.08")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal epfEmployer = base.multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal etfEmployer = base.multiply(new BigDecimal("0.03")).setScale(2, RoundingMode.HALF_UP);

        // Formula from Prompt Part 5:
        // Adjusted Basic = Basic Salary - Attendance / Unpaid Leave Deduction
        // Gross Salary = Adjusted Basic + Approved OT Pay + Active Allowances / Benefits
        // Net Salary = Gross Salary - Employee Deductions (epfEmployee + otherDeductions)
        BigDecimal adjustedBasic = base.subtract(attendanceDeduction);
        BigDecimal gross = adjustedBasic.add(otPay).add(allowances);
        BigDecimal otherDeductions = BigDecimal.ZERO;
        BigDecimal totalDeductions = epfEmployee.add(otherDeductions);
        BigDecimal net = gross.subtract(totalDeductions);

        CalculatedPayrollItem item = new CalculatedPayrollItem();
        item.employee = emp;
        item.baseSalary = base;
        item.adjustedBasic = adjustedBasic;
        item.regularWorkedHours = regularWorkedHours;
        item.overtimeHours = otHours;
        item.otRate = otRate;
        item.overtimePay = otPay;
        item.allowances = allowances;
        item.epfEmployee = epfEmployee;
        item.epfEmployer = epfEmployer;
        item.etfEmployer = etfEmployer;
        item.expectedWorkingDays = expectedWorkingDays;
        item.dailyRate = dailyRate;
        item.presentDays = presentCount;
        item.lateDays = lateCount;
        item.halfDays = halfDayCount;
        item.paidLeaveDays = totalPaidLeaveDays;
        item.unpaidLeaveDays = totalUnpaidLeaveDays;
        item.absentDays = totalAbsentDays;
        item.attendanceDeduction = attendanceDeduction;
        item.otherDeductions = otherDeductions;
        item.totalDeductions = totalDeductions;
        item.grossSalary = gross;
        item.netSalary = net;

        return item;
    }

    private boolean isEmployeeUser(UserPrincipal currentUser) {
        if (currentUser != null) {
            return "EMPLOYEE".equalsIgnoreCase(currentUser.getRole());
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_EMPLOYEE"));
        }
        return false;
    }

    private Long getLinkedEmployeeIdOrNull(UserPrincipal currentUser) {
        if (currentUser != null) {
            return employeeRepository.findByUserId(currentUser.getId())
                    .or(() -> employeeRepository.findByEmailIgnoreCase(currentUser.getEmail()))
                    .map(Employee::getId)
                    .orElse(null);
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            String name = auth.getName();
            return employeeRepository.findByEmailIgnoreCase(name)
                    .or(() -> userRepository.findByUsernameOrEmailIgnoreCase(name, name)
                            .flatMap(u -> employeeRepository.findByUserId(u.getId())))
                    .map(Employee::getId)
                    .orElse(null);
        }
        return null;
    }

    private static class CalculatedPayrollItem {
        Employee employee;
        BigDecimal baseSalary;
        BigDecimal adjustedBasic;
        BigDecimal regularWorkedHours;
        BigDecimal overtimeHours;
        BigDecimal otRate;
        BigDecimal overtimePay;
        BigDecimal allowances;
        BigDecimal epfEmployee;
        BigDecimal epfEmployer;
        BigDecimal etfEmployer;
        BigDecimal otherDeductions;
        BigDecimal totalDeductions;
        BigDecimal grossSalary;
        BigDecimal netSalary;
        Integer expectedWorkingDays;
        BigDecimal dailyRate;
        Integer presentDays;
        Integer lateDays;
        Integer halfDays;
        Integer paidLeaveDays;
        Integer unpaidLeaveDays;
        Integer absentDays;
        BigDecimal attendanceDeduction;
    }
}
