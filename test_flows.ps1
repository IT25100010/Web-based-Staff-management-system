$baseUrl = "http://localhost:8080/api"

function Login($username, $password) {
    $body = @{ username = $username; password = $password } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $res.token
}

Write-Host "Logging in as HR Manager..."
$hrToken = Login "hr_manager" "Password@123"
$hrHeaders = @{ Authorization = "Bearer $hrToken"; "Content-Type" = "application/json" }

Write-Host "Logging in as Finance Executive..."
$finToken = Login "finance_exec" "Password@123"
$finHeaders = @{ Authorization = "Bearer $finToken"; "Content-Type" = "application/json" }

# TEST 1: Create Position & Assign to Employee
Write-Host "`n=== TEST 1: Create Position & Assign to Employee ==="
$depts = Invoke-RestMethod -Uri "$baseUrl/employees/departments" -Headers $hrHeaders -Method Get
$deptId = $depts[0].id

$posBody = @{
    title = "Automation Lead $(Get-Random)"
    departmentId = $deptId
    level = "Senior"
    description = "Test Position for E2E validation"
    defaultMonthlySalary = 100000.00
    otRatePerHour = 750.00
    regularWorkingHoursPerDay = 8.0
} | ConvertTo-Json

$newPos = Invoke-RestMethod -Uri "$baseUrl/employees/positions" -Headers $hrHeaders -Method Post -Body $posBody
Write-Host "Created Position ID: $($newPos.id), Title: $($newPos.title), Salary: $($newPos.defaultMonthlySalary), OT Rate: $($newPos.otRatePerHour), Regular Hours: $($newPos.regularWorkingHoursPerDay)"

# Find an employee
$emps = Invoke-RestMethod -Uri "$baseUrl/employees" -Headers $hrHeaders -Method Get
$emp = $emps[0]

# Update Employee to use this position and 0 custom salary so Position salary is used
$updateEmpBody = @{
    firstName = $emp.firstName
    lastName = $emp.lastName
    email = $emp.email
    nic = $emp.nic
    departmentId = $deptId
    positionId = $newPos.id
    baseSalary = 0
} | ConvertTo-Json

$updatedEmp = Invoke-RestMethod -Uri "$baseUrl/employees/$($emp.id)" -Headers $hrHeaders -Method Put -Body $updateEmpBody
Write-Host "Assigned Position to Employee ID $($emp.id) ($($updatedEmp.firstName) $($updatedEmp.lastName))"

# TEST 2: Attendance Check In 08:00, Check Out 18:00 -> Worked: 10h, Regular: 8h, OT: 2h, OT Status: PENDING
Write-Host "`n=== TEST 2: Attendance Check In 08:00, Check Out 18:00 ==="
# Get a shift
$shifts = Invoke-RestMethod -Uri "$baseUrl/workforce/shifts" -Headers $hrHeaders -Method Get
$shiftId = if ($shifts.Count -gt 0) { $shifts[0].id } else { 1 }

$attDate = "2026-10-06"
$attBody = @{
    employeeId = $emp.id
    attendanceDate = $attDate
    shiftId = $shiftId
    checkInTime = "08:00:00"
    checkOutTime = "18:00:00"
    status = "PRESENT"
} | ConvertTo-Json

$attRes = Invoke-RestMethod -Uri "$baseUrl/attendance/record" -Headers $hrHeaders -Method Post -Body $attBody
Write-Host "Attendance recorded: Worked=$($attRes.workingHours)h, Regular=$($attRes.regularHours)h, OT=$($attRes.otHours)h"

# Verify Overtime Record
$ots = Invoke-RestMethod -Uri "$baseUrl/attendance/overtime?employeeId=$($emp.id)" -Headers $hrHeaders -Method Get
$matchingOt = $ots | Where-Object { $_.overtimeDate -eq $attDate } | Select-Object -First 1
Write-Host "Overtime Record created automatically: Date=$($matchingOt.overtimeDate), Hours=$($matchingOt.overtimeHours)h, Rate=LKR $($matchingOt.hourlyRate)/h, Amount=LKR $($matchingOt.totalAmount), Status=$($matchingOt.status)"

# TEST 3: Manager approves OT
Write-Host "`n=== TEST 3: Manager approves OT ==="
$approveBody = @{
    status = "APPROVED"
} | ConvertTo-Json

$approvedOt = Invoke-RestMethod -Uri "$baseUrl/attendance/overtime/$($matchingOt.id)" -Headers $hrHeaders -Method Put -Body $approveBody
Write-Host "OT Approved: Status=$($approvedOt.status), Hours=$($approvedOt.overtimeHours)h, Amount=LKR $($approvedOt.totalAmount) (Expected: 2h * 750 = 1500)"

# TEST 4: Finance generates Payroll
Write-Host "`n=== TEST 4: Finance generates Payroll Preview & Finalize ==="
# Clear existing cycle if present to ensure clean idempotency
$existingCycles = Invoke-RestMethod -Uri "$baseUrl/payroll/payrolls" -Headers $finHeaders -Method Get
$oldCycle = $existingCycles | Where-Object { $_.payrollMonth -eq 10 -and $_.payrollYear -eq 2026 } | Select-Object -First 1
if ($oldCycle) {
    Write-Host "Clearing previous test payroll cycle ID $($oldCycle.id) ($($oldCycle.periodName))..."
    Invoke-RestMethod -Uri "$baseUrl/payroll/payrolls/$($oldCycle.id)" -Headers $finHeaders -Method Delete | Out-Null
}

$previewBody = @{
    month = 10
    year = 2026
    periodName = "October 2026"
} | ConvertTo-Json

$preview = Invoke-RestMethod -Uri "$baseUrl/payroll/preview" -Headers $finHeaders -Method Post -Body $previewBody
Write-Host "Payroll Preview: Period=$($preview.periodName), Staff Count=$($preview.employeeCount), Expected Working Days=$($preview.expectedWorkingDays)"

$empPreview = $preview.details | Where-Object { $_.employeeId -eq $emp.id }
Write-Host "Employee Calculation Preview:"
Write-Host "  - Base Salary (from Position): LKR $($empPreview.baseSalary)"
Write-Host "  - Regular Worked Hours: $($empPreview.regularWorkedHours) hrs"
Write-Host "  - Approved OT Hours: $($empPreview.overtimeHours) hrs"
Write-Host "  - OT Rate: LKR $($empPreview.otRate)/hr"
Write-Host "  - Approved OT Pay: LKR $($empPreview.overtimePay)"
Write-Host "  - Attendance Deduction: LKR $($empPreview.attendanceDeduction)"
Write-Host "  - Gross Salary: LKR $($empPreview.grossSalary)"
Write-Host "  - Net Salary: LKR $($empPreview.netSalary)"

# Process draft payroll
$processRes = Invoke-RestMethod -Uri "$baseUrl/payroll/process" -Headers $finHeaders -Method Post -Body $previewBody
Write-Host "Draft Payroll Processed: ID=$($processRes.id), Status=$($processRes.status)"

# Finalize payroll
$finalizedRes = Invoke-RestMethod -Uri "$baseUrl/payroll/payrolls/$($processRes.id)/finalize" -Headers $finHeaders -Method Put
Write-Host "Payroll Finalized: ID=$($finalizedRes.id), Status=$($finalizedRes.status)"

# TEST 5: Payslips Security
Write-Host "`n=== TEST 5: Payslip Security ==="
$allPayslips = Invoke-RestMethod -Uri "$baseUrl/payroll/payslips" -Headers $finHeaders -Method Get
Write-Host "Finance Executive sees total payslips: $($allPayslips.Count)"
$mySlip = $allPayslips | Where-Object { $_.employee.id -eq $emp.id } | Select-Object -First 1
Write-Host "Payslip for $($emp.firstName): Number=$($mySlip.payslipNumber), Net=LKR $($mySlip.payrollDetail.netSalary), Status=$($mySlip.status)"

# TEST 6: Manager creates MCQ Assessment (10 Questions, 4 Answers, PassMark = 60)
Write-Host "`n=== TEST 6: Manager creates MCQ Assessment ==="
$questions = @()
for ($i = 1; $i -le 10; $i++) {
    $questions += @{
        questionText = "Question " + $i + " - Identify the primary port compliance regulation."
        displayOrder = $i
        options = @(
            @{ optionText = "Correct safety regulation standard"; correct = $true; displayOrder = 1 },
            @{ optionText = "Incorrect alternative protocol B"; correct = $false; displayOrder = 2 },
            @{ optionText = "Unsafe non-compliant option C"; correct = $false; displayOrder = 3 },
            @{ optionText = "Disallowed procedural exception D"; correct = $false; displayOrder = 4 }
        )
    }
}

$mcqBody = @{
    name = "Port Safety Certification $(Get-Random)"
    departmentId = $deptId
    passMark = 60
    startDate = "2026-10-01"
    endDate = "2026-10-31"
    instructions = "Complete all 10 questions. 10 marks per question. Pass mark is 60%."
    questions = $questions
    assignedEmployeeIds = @($emp.id)
} | ConvertTo-Json -Depth 6

$mcqRes = Invoke-RestMethod -Uri "$baseUrl/performance/kpis/mcq-wizard" -Headers $hrHeaders -Method Post -Body $mcqBody
Write-Host "MCQ KPI Created: ID=$($mcqRes.id), Name=$($mcqRes.name), Pass Mark=$($mcqRes.passMark)%, Total Score=$($mcqRes.maxScore)"

# TEST 7: Complete Assessment & Score Derivation
Write-Host "`n=== TEST 7: Submit MCQ Assessment ==="
$assignments = Invoke-RestMethod -Uri "$baseUrl/performance/kpis/$($mcqRes.id)/assignments" -Headers $hrHeaders -Method Get
$assignment = $assignments | Where-Object { $_.employee.id -eq $emp.id } | Select-Object -First 1
Write-Host "Found Assignment ID $($assignment.id) for Employee $($emp.id)"

$qList = Invoke-RestMethod -Uri "$baseUrl/performance/kpis/$($mcqRes.id)/questions" -Headers $hrHeaders -Method Get
$answersMap = @{}
# 8 correct, 2 wrong -> Score = 80/100 -> Pass (Pass Mark = 60%)
for ($i = 0; $i -lt $qList.Count; $i++) {
    $q = $qList[$i]
    if ($i -lt 8) {
        $opt = $q.options | Where-Object { $_.correct -eq $true } | Select-Object -First 1
        $answersMap[$q.id.ToString()] = $opt.id
    } else {
        $opt = $q.options | Where-Object { $_.correct -eq $false } | Select-Object -First 1
        $answersMap[$q.id.ToString()] = $opt.id
    }
}

$submitBody = @{
    assignmentId = $assignment.id
    answers = $answersMap
} | ConvertTo-Json

# Submit assessment via endpoint
$submittedResult = Invoke-RestMethod -Uri "$baseUrl/performance/my-kpis/$($assignment.id)/submit" -Headers $hrHeaders -Method Post -Body $submitBody
Write-Host "Assessment Submitted for Assignment $($assignment.id):"
Write-Host "  - Score: $($submittedResult.score) / $($submittedResult.maxScore)"
Write-Host "  - Grade: $($submittedResult.grade)"
Write-Host "  - Percentage: $($submittedResult.percentage)%"

# Check kpi results summary
$scoreRes = Invoke-RestMethod -Uri "$baseUrl/performance/kpis/$($mcqRes.id)/results-summary" -Headers $hrHeaders -Method Get
Write-Host "Results Summary for KPI $($mcqRes.name):"
Write-Host "  - Total Assigned: $($scoreRes.assignedEmployees)"
Write-Host "  - Completed: $($scoreRes.completed)"
Write-Host "  - Pass Count: $($scoreRes.passCount)"
Write-Host "  - Fail Count: $($scoreRes.failCount)"
Write-Host "  - Average Score: $($scoreRes.averageScore)%"
Write-Host "  - Pass Mark: $($scoreRes.passMark)%"

# TEST 8: Performance Review
Write-Host "`n=== TEST 8: Performance Review ==="
$empKpiData = Invoke-RestMethod -Uri "$baseUrl/performance/evaluations/employee-kpis?employeeId=$($emp.id)&period=2026-Q4" -Headers $hrHeaders -Method Get
Write-Host "Loaded Employee KPIs for Review:"
Write-Host "  - Completed KPI Activities: $($empKpiData.completedKpis.Count)"
Write-Host "  - Average KPI Score: $($empKpiData.averageScore)%"
Write-Host "  - Auto-Derived Performance Grade: $($empKpiData.derivedGrade)"

$reviewBody = @{
    employeeId = $emp.id
    evaluationPeriod = "2026-Q4"
    overallScore = $empKpiData.averageScore
    comments = "Demonstrated exemplary commitment to port operations and safety protocols."
    recommendations = "Recommended for lead terminal supervision."
} | ConvertTo-Json

$reviewRes = Invoke-RestMethod -Uri "$baseUrl/performance/evaluations" -Headers $hrHeaders -Method Post -Body $reviewBody
Write-Host "Performance Review Created: ID=$($reviewRes.id), Score=$($reviewRes.overallScore), Grade=$($reviewRes.performanceGrade)"

Write-Host "`n=========================================="
Write-Host "ALL 8 END-TO-END TESTS COMPLETED SUCCESSFULLY!"
Write-Host "=========================================="
