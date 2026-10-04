package com.lws.staff_management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lws.staff_management.employee.Department;
import com.lws.staff_management.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class MySQLIntegrationVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentEmployeeSequenceRepository sequenceRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String[] TEST_IDS_TO_CLEAN = {
            "LK10000001", "LK10000002", "LK10000003", "LK10000004", "LK20000001", "LK20000002"
    };

    private static final String[] TEST_EMAILS_TO_CLEAN = {
            "test1@lws.lk", "test2@lws.lk", "test2_1@lws.lk", "test2_2@lws.lk", "test3@lws.lk", "test4@lws.lk"
    };

    @BeforeEach
    void cleanBefore() {
        cleanTestData();
    }

    @AfterEach
    void cleanAfter() {
        cleanTestData();
    }

    private void cleanTestData() {
        // 1. Delete test employees
        for (String tid : TEST_IDS_TO_CLEAN) {
            employeeRepository.findByEmployeeId(tid).ifPresent(e -> {
                e.setUser(null);
                employeeRepository.save(e);
                employeeRepository.delete(e);
            });
        }
        // 2. Delete test users created during test runs
        for (String email : TEST_EMAILS_TO_CLEAN) {
            userRepository.findByEmailIgnoreCase(email).ifPresent(userRepository::delete);
            userRepository.findByUsername(email).ifPresent(userRepository::delete);
        }
        // 3. Reset sequences for departments 1 and 2
        try { sequenceRepository.deleteById(1L); } catch (Exception ignored) {}
        try { sequenceRepository.deleteById(2L); } catch (Exception ignored) {}
    }

    @Test
    @DisplayName("Verify exact requirements against live MySQL: Dept 1 -> LK10000001, LK10000002; Dept 2 -> LK20000001, LK20000002; Dept 1 -> LK10000003; Persisted sequence -> LK10000004")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testLiveMySQLEmployeeRegistrationSequence() throws Exception {
        // Ensure Department 1 exists
        Department dept1 = departmentRepository.findById(1L).orElseGet(() -> {
            Department d = new Department("Human Resources", "HR", "HR Department");
            return departmentRepository.save(d);
        });
        assertEquals(1L, dept1.getId(), "Department 1 ID must be 1");

        // Ensure Department 2 exists
        Department dept2 = departmentRepository.findById(2L).orElseGet(() -> {
            Department d = new Department("Information Technology", "IT", "IT Department");
            return departmentRepository.save(d);
        });
        assertEquals(2L, dept2.getId(), "Department 2 ID must be 2");

        // 1. Department 1 - Employee 1
        String id1 = registerEmp(1L, "TestOne", "User", "NIC10000001", "test1@lws.lk");
        assertEquals("LK10000001", id1, "First employee for Department 1 must be LK10000001");

        // 2. Department 1 - Employee 2
        String id2 = registerEmp(1L, "TestTwo", "User", "NIC10000002", "test2@lws.lk");
        assertEquals("LK10000002", id2, "Second employee for Department 1 must be LK10000002");

        // 3. Department 2 - Employee 1
        String id2_1 = registerEmp(2L, "TestThree", "User", "NIC20000001", "test2_1@lws.lk");
        assertEquals("LK20000001", id2_1, "First employee for Department 2 must be LK20000001");

        // 4. Department 2 - Employee 2
        String id2_2 = registerEmp(2L, "TestFour", "User", "NIC20000002", "test2_2@lws.lk");
        assertEquals("LK20000002", id2_2, "Second employee for Department 2 must be LK20000002");

        // 5. Department 1 - Employee 3
        String id3 = registerEmp(1L, "TestFive", "User", "NIC10000003", "test3@lws.lk");
        assertEquals("LK10000003", id3, "Third employee for Department 1 must be LK10000003");

        // 6. Verify MySQL persistence of sequence table
        var seqRow = sequenceRepository.findById(1L).orElseThrow();
        assertEquals(3L, seqRow.getLastSequence(), "Department 1 last sequence in MySQL must be 3");

        // 7. Subsequent registration for Department 1 (proving MySQL persistence)
        String id4 = registerEmp(1L, "TestSix", "User", "NIC10000004", "test4@lws.lk");
        assertEquals("LK10000004", id4, "Fourth employee for Department 1 must be LK10000004");

        var seqRowAfter = sequenceRepository.findById(1L).orElseThrow();
        assertEquals(4L, seqRowAfter.getLastSequence(), "Department 1 last sequence in MySQL must be 4");
    }

    private String registerEmp(Long deptId, String first, String last, String nic, String email) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("departmentId", deptId);
        payload.put("firstName", first);
        payload.put("lastName", last);
        payload.put("nic", nic);
        payload.put("email", email);
        payload.put("phone", "0770000000");

        MvcResult res = mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").exists())
                .andReturn();

        Map<?, ?> resMap = objectMapper.readValue(res.getResponse().getContentAsString(), Map.class);
        return (String) resMap.get("employeeId");
    }
}
