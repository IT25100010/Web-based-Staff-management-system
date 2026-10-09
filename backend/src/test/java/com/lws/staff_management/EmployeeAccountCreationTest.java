package com.lws.staff_management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lws.staff_management.auth.dto.LoginRequest;
import com.lws.staff_management.employee.Department;
import com.lws.staff_management.employee.DepartmentRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class EmployeeAccountCreationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.lws.staff_management.auth.repository.EmailOtpRepository emailOtpRepository;

    @MockBean
    private JavaMailSender mailSender;

    private Department testDept;

    @BeforeEach
    void setUp() {
        testDept = departmentRepository.findAll().stream().findFirst().orElseGet(() -> {
            Department d = new Department("TEST_D", "Test Department", "For Testing");
            return departmentRepository.save(d);
        });
    }

    @AfterEach
    void cleanUp() {
        // Clean up test-created employees and users
        List<String> testNics = List.of("200012345678", "200099999999", "199012345678");
        for (String nic : testNics) {
            employeeRepository.findByNic(nic).ifPresent(e -> {
                Long userId = e.getUser() != null ? e.getUser().getId() : null;
                employeeRepository.delete(e);
                if (userId != null) {
                    emailOtpRepository.findByUserId(userId).ifPresent(emailOtpRepository::delete);
                    userRepository.deleteById(userId);
                }
            });
        }
        for (String email : List.of("kamal.perera@example.com", "kamal.login@example.com", "kamal.vis@example.com", "kamal.edit@example.com")) {
            userRepository.findByEmail(email).ifPresent(u -> {
                emailOtpRepository.findByUserId(u.getId()).ifPresent(emailOtpRepository::delete);
                userRepository.delete(u);
            });
        }
    }

    @Test
    @DisplayName("1. Automatic User Account Creation with Real Email and BCrypt NIC Password")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testAutomaticUserAccountCreationWithRealEmail() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("departmentId", testDept.getId());
        payload.put("firstName", "Kamal");
        payload.put("lastName", "Perera");
        payload.put("nic", "200012345678");
        payload.put("email", "kamal.perera@example.com");
        payload.put("phone", "0771234567");
        payload.put("employmentStatus", "Active");

        // 1. Register Employee via POST /api/employees
        MvcResult result = mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").exists())
                .andExpect(jsonPath("$.role").value("EMPLOYEE"))
                .andExpect(jsonPath("$.email").value("kamal.perera@example.com"))
                .andExpect(jsonPath("$.loginEmail").value("kamal.perera@example.com"))
                .andExpect(jsonPath("$.message").value("Employee registered successfully. Staff Member login account has been created."))
                .andReturn();

        Map<?, ?> resMap = objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
        String generatedEmpId = (String) resMap.get("employeeId");
        assertTrue(generatedEmpId.startsWith("LK" + testDept.getId()), "Generated ID must start with LK + departmentId");

        // 2. Verify Employee saved
        Optional<Employee> empOpt = employeeRepository.findByEmployeeId(generatedEmpId);
        assertTrue(empOpt.isPresent(), "Employee should be saved with generated ID: " + generatedEmpId);
        Employee emp = empOpt.get();
        assertEquals("Kamal", emp.getFirstName());
        assertEquals("200012345678", emp.getNic());
        assertEquals("kamal.perera@example.com", emp.getEmail());

        // 3. Verify linked User account created automatically with real email
        assertNotNull(emp.getUser(), "Employee must have linked User account");
        User user = emp.getUser();

        // 4. Verify login email / username is real email, NOT @lk.com
        assertEquals("kamal.perera@example.com", user.getUsername());
        assertEquals("kamal.perera@example.com", user.getEmail());
        assertFalse(user.getEmail().contains("@lk.com"), "User email must NOT contain @lk.com");

        // 5. Verify role is EMPLOYEE only
        assertEquals(Role.EMPLOYEE, user.getRole());
        assertTrue(user.isActive(), "User account should be active by default");

        // 6. Verify password is BCrypt hashed, NOT plain text
        assertNotEquals("200012345678", user.getPassword(), "Password must NOT be plain text");
        assertTrue(passwordEncoder.matches("200012345678", user.getPassword()),
                "BCrypt password must match employee's NIC number");
    }

    @Test
    @DisplayName("2. Staff Member Login with Real Email and NIC Password")
    void testStaffMemberLoginWithRealEmail() throws Exception {
        String empId = "LK" + testDept.getId() + "0000099";
        String realEmail = "kamal.login@example.com";

        User user = new User(realEmail, realEmail, passwordEncoder.encode("200012345678"), "Kamal Perera", Role.EMPLOYEE);
        User savedUser = userRepository.save(user);

        Employee employee = new Employee();
        employee.setEmployeeId(empId);
        employee.setDepartment(testDept);
        employee.setFirstName("Kamal");
        employee.setLastName("Perera");
        employee.setNic("200012345678");
        employee.setEmail(realEmail);
        employee.setPhone("0771234567");
        employee.setUser(savedUser);
        employeeRepository.save(employee);

        // Step 1: Login with real email & NIC password -> Employee requires OTP challenge (No JWT yet)
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername(realEmail);
        loginRequest.setPassword("200012345678");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresOtp").value(true))
                .andExpect(jsonPath("$.challengeId").exists())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        String challengeId = objectMapper.readTree(responseBody).get("challengeId").asText();

        // Preset known OTP hash in DB to test verification step
        com.lws.staff_management.auth.entity.EmailOtp otpEntity = emailOtpRepository.findByChallengeId(challengeId).orElseThrow();
        otpEntity.setOtpHash(passwordEncoder.encode("883311"));
        emailOtpRepository.save(otpEntity);

        // Step 2: Verify login OTP -> receives JWT
        com.lws.staff_management.auth.dto.VerifyLoginOtpRequest verifyReq = new com.lws.staff_management.auth.dto.VerifyLoginOtpRequest();
        verifyReq.setChallengeId(challengeId);
        verifyReq.setOtp("883311");

        mockMvc.perform(post("/api/auth/verify-login-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("EMPLOYEE"))
                .andExpect(jsonPath("$.username").value(realEmail))
                .andExpect(jsonPath("$.email").value(realEmail));
    }

    @Test
    @DisplayName("3. Reject Blank, Invalid Format, and Duplicate Emails")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testEmailValidations() throws Exception {
        // A. Missing / Blank Email
        Map<String, Object> payload1 = new HashMap<>();
        payload1.put("departmentId", testDept.getId());
        payload1.put("firstName", "Sunil");
        payload1.put("lastName", "Silva");
        payload1.put("nic", "199012345678");
        payload1.put("email", "   ");
        payload1.put("phone", "0771112233");

        mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("First Name, Last Name, NIC, Email, and Phone are required fields."));

        // B. Invalid Email Format
        Map<String, Object> payload2 = new HashMap<>();
        payload2.put("departmentId", testDept.getId());
        payload2.put("firstName", "Sunil");
        payload2.put("lastName", "Silva");
        payload2.put("nic", "199012345678");
        payload2.put("email", "invalid-email-format");
        payload2.put("phone", "0771112233");

        mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid email format: invalid-email-format"));

        // C. Duplicate Email (existing system user or employee)
        Map<String, Object> payload3 = new HashMap<>();
        payload3.put("departmentId", testDept.getId());
        payload3.put("firstName", "Sunil");
        payload3.put("lastName", "Silva");
        payload3.put("nic", "199012345678");
        payload3.put("email", "hr@lankaworkforce.com"); // System user email
        payload3.put("phone", "0771112233");

        mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload3)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email is already registered: hr@lankaworkforce.com"));
    }

    @Test
    @DisplayName("4. HR Manager and IT Coordinator Visibility into Staff Accounts")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testHrAndItVisibility() throws Exception {
        String empId = "LK" + testDept.getId() + "0000088";
        String realEmail = "kamal.vis@example.com";

        User user = userRepository.findByEmail(realEmail).orElseGet(() -> {
            User u = new User(realEmail, realEmail, passwordEncoder.encode("200012345678"), "Kamal Perera", Role.EMPLOYEE);
            return userRepository.save(u);
        });

        employeeRepository.findByEmployeeId(empId).orElseGet(() -> {
            Employee e = new Employee();
            e.setEmployeeId(empId);
            e.setDepartment(testDept);
            e.setFirstName("Kamal");
            e.setLastName("Perera");
            e.setNic("200012345678");
            e.setEmail(realEmail);
            e.setPhone("0771234567");
            e.setUser(user);
            return employeeRepository.save(e);
        });

        // Query GET /api/admin/users
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email == '" + realEmail + "')].employeeId").value(empId))
                .andExpect(jsonPath("$[?(@.email == '" + realEmail + "')].role").value("EMPLOYEE"))
                .andExpect(jsonPath("$[?(@.email == '" + realEmail + "')].password").doesNotExist());
    }

    @Test
    @DisplayName("5. No Duplicate Account Created When Employee is Edited")
    @WithMockUser(username = "hr_manager", roles = {"HR_MANAGER"})
    void testNoDuplicateAccountOnEdit() throws Exception {
        // Register employee
        Map<String, Object> payload = new HashMap<>();
        payload.put("departmentId", testDept.getId());
        payload.put("firstName", "Kamal");
        payload.put("lastName", "Perera");
        payload.put("nic", "200012345678");
        payload.put("email", "kamal.edit@example.com");
        payload.put("phone", "0771234567");

        MvcResult result = mockMvc.perform(post("/api/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andReturn();

        Map<?, ?> resMap = objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
        String generatedEmpId = (String) resMap.get("employeeId");

        Employee emp = employeeRepository.findByEmployeeId(generatedEmpId).orElseThrow();
        long initialUserCount = userRepository.count();

        // Update employee details
        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("firstName", "Kamal Shantha");
        updatePayload.put("phone", "0779999999");

        mockMvc.perform(put("/api/employees/" + emp.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatePayload)))
                .andExpect(status().isOk());

        // Verify count remains same and user fullName was updated
        assertEquals(initialUserCount, userRepository.count(), "User count must not increase on edit");
        User linkedUser = userRepository.findByEmail("kamal.edit@example.com").orElseThrow();
        assertEquals("Kamal Shantha Perera", linkedUser.getFullName(), "User full name should synchronize");
    }
}
