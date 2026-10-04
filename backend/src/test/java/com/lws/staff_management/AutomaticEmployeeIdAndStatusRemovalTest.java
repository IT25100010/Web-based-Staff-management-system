package com.lws.staff_management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lws.staff_management.employee.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class AutomaticEmployeeIdAndStatusRemovalTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PositionRepository positionRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private DepartmentEmployeeSequenceRepository sequenceRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanUp() {
        employeeRepository.deleteAll();
        positionRepository.deleteAll();
        sequenceRepository.deleteAll();
        departmentRepository.deleteAll();
    }

    @Test
    @DisplayName("Department & Position CRUD works without status field")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testDepartmentAndPositionCrudWithoutStatus() throws Exception {
        // 1. Create Department
        Map<String, String> deptPayload = new HashMap<>();
        deptPayload.put("name", "Engineering Operations");
        deptPayload.put("code", "ENG");
        deptPayload.put("description", "Software & Hardware Engineering");

        MvcResult deptRes = mockMvc.perform(post("/api/employees/departments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deptPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Engineering Operations"))
                .andExpect(jsonPath("$.code").value("ENG"))
                .andExpect(jsonPath("$.description").value("Software & Hardware Engineering"))
                .andExpect(jsonPath("$.status").doesNotExist())
                .andReturn();

        Department dept = objectMapper.readValue(deptRes.getResponse().getContentAsString(), Department.class);
        assertNotNull(dept.getId());

        // 2. Create Position
        Map<String, Object> posPayload = new HashMap<>();
        posPayload.put("title", "Lead Systems Architect");
        posPayload.put("departmentId", dept.getId());
        posPayload.put("description", "Core architecture design");
        posPayload.put("level", "Senior");

        mockMvc.perform(post("/api/employees/positions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(posPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Lead Systems Architect"))
                .andExpect(jsonPath("$.level").value("Senior"))
                .andExpect(jsonPath("$.status").doesNotExist());
    }

    @Test
    @DisplayName("Per-department independent sequence generation: LK + deptId + 7 digits")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testPerDepartmentAutomaticSequence() throws Exception {
        // Create Department 1 (ID will be allocated by DB)
        Department dept1 = departmentRepository.save(new Department("Operations Division", "OPS", "Operations"));
        Long deptId1 = dept1.getId();

        // Create Department 2
        Department dept2 = departmentRepository.save(new Department("Finance Division", "FIN", "Finance"));
        Long deptId2 = dept2.getId();

        // Register Dept 1 - Employee 1 -> LK[deptId1]0000001
        String empId1_1 = registerEmployee(deptId1, "Amal", "Perera", "901111111V", "amal@example.com");
        assertEquals("LK" + deptId1 + "0000001", empId1_1);

        // Register Dept 1 - Employee 2 -> LK[deptId1]0000002
        String empId1_2 = registerEmployee(deptId1, "Nimal", "Silva", "902222222V", "nimal@example.com");
        assertEquals("LK" + deptId1 + "0000002", empId1_2);

        // Register Dept 2 - Employee 1 -> LK[deptId2]0000001
        String empId2_1 = registerEmployee(deptId2, "Sunil", "Fernando", "903333333V", "sunil@example.com");
        assertEquals("LK" + deptId2 + "0000001", empId2_1);

        // Register Dept 2 - Employee 2 -> LK[deptId2]0000002
        String empId2_2 = registerEmployee(deptId2, "Kamal", "Gunasekara", "904444444V", "kamal@example.com");
        assertEquals("LK" + deptId2 + "0000002", empId2_2);

        // Register another in Dept 1 -> LK[deptId1]0000003
        String empId1_3 = registerEmployee(deptId1, "Chaminda", "Vass", "905555555V", "chaminda@example.com");
        assertEquals("LK" + deptId1 + "0000003", empId1_3);

        // Verify sequence persistence for Dept 1
        DepartmentEmployeeSequence seq1 = sequenceRepository.findById(deptId1).orElseThrow();
        assertEquals(3L, seq1.getLastSequence());

        // Subsequent registration produces LK[deptId1]0000004
        String empId1_4 = registerEmployee(deptId1, "Mahela", "Jayawardena", "906666666V", "mahela@example.com");
        assertEquals("LK" + deptId1 + "0000004", empId1_4);

        seq1 = sequenceRepository.findById(deptId1).orElseThrow();
        assertEquals(4L, seq1.getLastSequence());
    }

    @Test
    @DisplayName("Validation fails with 400 when departmentId missing, non-existent, or position mismatch")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testValidationRules() throws Exception {
        Department dept1 = departmentRepository.save(new Department("Legal Division", "LEG", "Legal"));
        Department dept2 = departmentRepository.save(new Department("Marketing Division", "MKT", "Marketing"));
        Position pos2 = positionRepository.save(new Position("Content Strategist", dept2, "Marketing"));

        // Case A: Missing departmentId
        Map<String, Object> missingDept = new HashMap<>();
        missingDept.put("firstName", "John");
        missingDept.put("lastName", "Doe");
        missingDept.put("nic", "199988887777");
        missingDept.put("email", "john@example.com");
        missingDept.put("phone", "0712345678");

        mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(missingDept)))
                .andExpect(status().isBadRequest());

        // Case B: Non-existent departmentId
        Map<String, Object> badDept = new HashMap<>(missingDept);
        badDept.put("departmentId", 99999L);

        mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badDept)))
                .andExpect(status().isBadRequest());

        // Case C: Position from another department
        Map<String, Object> mismatchedPos = new HashMap<>(missingDept);
        mismatchedPos.put("departmentId", dept1.getId());
        mismatchedPos.put("positionId", pos2.getId()); // pos2 belongs to dept2, not dept1!

        mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mismatchedPos)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Initializes sequence from existing highest 7-digit pattern (e.g. LK10000001, LK10000004 -> next LK10000005)")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testExistingEmployeesWithHigherSequence() throws Exception {
        Department dept = departmentRepository.save(new Department("Security Division", "SEC", "Security"));
        Long deptId = dept.getId();

        // Seed existing employees with new pattern
        Employee e1 = new Employee();
        e1.setEmployeeId("LK" + deptId + "0000001");
        e1.setFirstName("Old1");
        e1.setLastName("Staff");
        e1.setNic("111111111V");
        e1.setEmail("old1@sec.com");
        e1.setPhone("0711111111");
        e1.setDepartment(dept);
        employeeRepository.save(e1);

        Employee e4 = new Employee();
        e4.setEmployeeId("LK" + deptId + "0000004");
        e4.setFirstName("Old4");
        e4.setLastName("Staff");
        e4.setNic("444444444V");
        e4.setEmail("old4@sec.com");
        e4.setPhone("0744444444");
        e4.setDepartment(dept);
        employeeRepository.save(e4);

        // Also add a legacy ID that does not match the new format: should be ignored
        Employee legacy = new Employee();
        legacy.setEmployeeId("LK99");
        legacy.setFirstName("Legacy");
        legacy.setLastName("User");
        legacy.setNic("999999999V");
        legacy.setEmail("legacy@sec.com");
        legacy.setPhone("0799999999");
        legacy.setDepartment(dept);
        employeeRepository.save(legacy);

        // Now register new employee: next sequence must be 5 -> LK[deptId]0000005
        String newEmpId = registerEmployee(deptId, "New", "Employee", "555555555V", "new@sec.com");
        assertEquals("LK" + deptId + "0000005", newEmpId);
    }

    private String registerEmployee(Long deptId, String firstName, String lastName, String nic, String email) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("departmentId", deptId);
        payload.put("firstName", firstName);
        payload.put("lastName", lastName);
        payload.put("nic", nic);
        payload.put("email", email);
        payload.put("phone", "0771234567");
        payload.put("employmentStatus", "Active");

        MvcResult res = mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andReturn();

        Map<?, ?> resMap = objectMapper.readValue(res.getResponse().getContentAsString(), Map.class);
        return (String) resMap.get("employeeId");
    }
}
