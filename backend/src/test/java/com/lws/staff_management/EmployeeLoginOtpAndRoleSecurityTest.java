package com.lws.staff_management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lws.staff_management.auth.entity.EmailOtp;
import com.lws.staff_management.auth.repository.EmailOtpRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class EmployeeLoginOtpAndRoleSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private EmailOtpRepository emailOtpRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String EMP_EMAIL = "perera.otp.test@lws.lk";
    private static final String HR_EMAIL = "hr.test@lws.lk";
    private static final String RAW_PASS = "SecretPass123";

    private User empUser;
    private User hrUser;
    private Employee employee;

    @BeforeEach
    void setUp() {
        cleanData();

        // 1. Create Employee User: (username, email, password, fullName, role)
        empUser = new User(EMP_EMAIL, EMP_EMAIL, passwordEncoder.encode(RAW_PASS), "Kamal Perera", Role.EMPLOYEE);
        empUser = userRepository.save(empUser);

        employee = new Employee();
        employee.setEmployeeId("LK9990001");
        employee.setFirstName("Kamal");
        employee.setLastName("Perera");
        employee.setNic("199512345678");
        employee.setEmail(EMP_EMAIL);
        employee.setEmploymentStatus("Active");
        employee.setPhone("0779988776");
        employee.setUser(empUser);
        employee = employeeRepository.save(employee);

        // 2. Create HR User (Non-Employee): (username, email, password, fullName, role)
        hrUser = new User(HR_EMAIL, HR_EMAIL, passwordEncoder.encode(RAW_PASS), "HR Manager", Role.HR_MANAGER);
        hrUser = userRepository.save(hrUser);
    }

    @AfterEach
    void tearDown() {
        cleanData();
    }

    private void cleanData() {
        if (empUser != null && empUser.getId() != null) {
            emailOtpRepository.findByUserId(empUser.getId()).ifPresent(emailOtpRepository::delete);
        }
        userRepository.findByEmail(EMP_EMAIL).ifPresent(u -> {
            emailOtpRepository.findByUserId(u.getId()).ifPresent(emailOtpRepository::delete);
            employeeRepository.findByEmail(EMP_EMAIL).ifPresent(employeeRepository::delete);
            userRepository.delete(u);
        });
        userRepository.findByEmail(HR_EMAIL).ifPresent(userRepository::delete);
    }

    @Test
    @DisplayName("15. EMPLOYEE wrong password -> 401, no OTP, no JWT")
    void testEmployeeLogin_WrongPassword_Rejected() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setUsername(EMP_EMAIL);
        req.setPassword("WrongPasswordXYZ");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.requiresOtp").doesNotExist());

        // Verify no OTP was created in database
        assertTrue(emailOtpRepository.findByUserId(empUser.getId()).isEmpty(),
                "No OTP records should be generated for invalid login attempt");
    }

    @Test
    @DisplayName("16. EMPLOYEE correct password -> requiresOtp=true, challengeId, no JWT yet")
    void testEmployeeLogin_CorrectPassword_RequiresOtp() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setUsername(EMP_EMAIL);
        req.setPassword(RAW_PASS);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresOtp").value(true))
                .andExpect(jsonPath("$.challengeId").exists())
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("17. Correct OTP verification -> normal JWT and user response issued")
    void testEmployeeLogin_VerifyOtp_Success() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setUsername(EMP_EMAIL);
        req.setPassword(RAW_PASS);

        MvcResult loginRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String challengeId = objectMapper.readTree(loginRes.getResponse().getContentAsString()).get("challengeId").asText();

        // Preset OTP hash to 654321 for verification
        EmailOtp otpEntity = emailOtpRepository.findByChallengeId(challengeId).orElseThrow();
        otpEntity.setOtpHash(passwordEncoder.encode("654321"));
        emailOtpRepository.save(otpEntity);

        VerifyLoginOtpRequest verifyReq = new VerifyLoginOtpRequest();
        verifyReq.setChallengeId(challengeId);
        verifyReq.setOtp("654321");

        mockMvc.perform(post("/api/auth/verify-login-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("EMPLOYEE"))
                .andExpect(jsonPath("$.email").value(EMP_EMAIL));
    }

    @Test
    @DisplayName("18. HR_MANAGER / Non-Employee login -> immediate JWT, no OTP")
    void testHrManagerLogin_ImmediateJwt_NoOtp() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setUsername(HR_EMAIL);
        req.setPassword(RAW_PASS);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("HR_MANAGER"))
                .andExpect(jsonPath("$.requiresOtp").doesNotExist());

        // Verify no OTP challenges created for HR Manager
        assertTrue(emailOtpRepository.findByUserId(hrUser.getId()).isEmpty(),
                "Non-employee roles must NEVER trigger OTP creation");
    }

    @Test
    @DisplayName("14. Unauthorized role cannot modify workforce assignments")
    @WithMockUser(username = "emp@test.lk", roles = {"EMPLOYEE"})
    void testUnauthorizedRole_CannotModifyAssignments() throws Exception {
        Map<String, Object> payload = Map.of(
                "employeeId", 1,
                "shiftId", 1,
                "assignmentDate", "2026-10-15"
        );

        // An EMPLOYEE attempting to assign workforce must receive 403 Forbidden
        mockMvc.perform(post("/api/workforce/assignments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }
}
