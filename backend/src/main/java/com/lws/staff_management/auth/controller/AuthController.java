package com.lws.staff_management.auth.controller;

import com.lws.staff_management.admin.AuditLog;
import com.lws.staff_management.admin.AuditLogRepository;
import com.lws.staff_management.auth.dto.*;
import com.lws.staff_management.auth.entity.EmailOtp;
import com.lws.staff_management.auth.repository.EmailOtpRepository;
import com.lws.staff_management.auth.service.EmailService;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.security.JwtTokenProvider;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_FAILED_ATTEMPTS = 5;

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthController(AuthenticationManager authenticationManager,
                          JwtTokenProvider tokenProvider,
                          UserRepository userRepository,
                          EmployeeRepository employeeRepository,
                          AuditLogRepository auditLogRepository,
                          EmailOtpRepository emailOtpRepository,
                          EmailService emailService,
                          PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.auditLogRepository = auditLogRepository;
        this.emailOtpRepository = emailOtpRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        // 1. Authenticate credentials first
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        // 2. Role Check: OTP applies ONLY to EMPLOYEE role
        if (!Role.EMPLOYEE.name().equalsIgnoreCase(userPrincipal.getRole())) {
            // NON-EMPLOYEE: issue JWT immediately (no OTP)
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);

            Optional<Employee> employeeOpt = employeeRepository.findByUserId(userPrincipal.getId());
            Long employeeId = employeeOpt.map(Employee::getId).orElse(null);

            auditLogRepository.save(new AuditLog(
                    userPrincipal.getUsername(),
                    "USER_LOGIN",
                    request.getRemoteAddr(),
                    "User logged in with role: " + userPrincipal.getRole()
            ));

            return ResponseEntity.ok(new AuthResponse(
                    jwt,
                    userPrincipal.getId(),
                    userPrincipal.getUsername(),
                    userPrincipal.getEmail(),
                    userPrincipal.getFullName(),
                    userPrincipal.getRole(),
                    employeeId
            ));
        }

        // 3. EMPLOYEE Login: Do NOT return JWT. Initiate 2-step OTP Challenge
        emailOtpRepository.invalidateActiveChallengesForUser(userPrincipal.getId());

        String challengeId = UUID.randomUUID().toString();
        int code = secureRandom.nextInt(1000000);
        String plainOtp = String.format("%06d", code);

        String otpHash = passwordEncoder.encode(plainOtp);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);

        EmailOtp challenge = new EmailOtp(challengeId, userPrincipal.getId(), userPrincipal.getEmail(), otpHash, expiresAt);
        emailOtpRepository.save(challenge);

        // Dispatch OTP to employee's real email (Plain OTP is never logged)
        emailService.sendEmployeeLoginOtp(userPrincipal.getEmail(), userPrincipal.getFullName(), plainOtp);

        auditLogRepository.save(new AuditLog(
                userPrincipal.getUsername(),
                "EMPLOYEE_LOGIN_CHALLENGE_CREATED",
                request.getRemoteAddr(),
                "Employee login challenge generated. OTP sent to real email."
        ));

        Map<String, Object> response = new HashMap<>();
        response.put("requiresOtp", true);
        response.put("challengeId", challengeId);
        response.put("message", "Verification code sent to your registered email");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-login-otp")
    @Transactional
    public ResponseEntity<?> verifyLoginOtp(@Valid @RequestBody VerifyLoginOtpRequest request, HttpServletRequest httpRequest) {
        String challengeId = request.getChallengeId().trim();
        String plainOtp = request.getOtp().trim();

        EmailOtp challenge = emailOtpRepository.findByChallengeId(challengeId)
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification session. Please log in again."));

        if (challenge.isUsed()) {
            throw new BadRequestException("This verification code session has already been used. Please log in again.");
        }

        User user = userRepository.findById(challenge.getUserId())
                .orElseThrow(() -> new BadRequestException("Associated employee account not found."));

        if (user.getRole() != Role.EMPLOYEE) {
            throw new BadRequestException("Invalid role for OTP verification challenge.");
        }

        // Expiration check (5 minutes)
        if (challenge.getExpiresAt().isBefore(LocalDateTime.now())) {
            challenge.setUsed(true);
            emailOtpRepository.save(challenge);
            throw new BadRequestException("Verification code has expired. Please request a new code.");
        }

        // Failed attempts check (maximum 5)
        if (challenge.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            challenge.setUsed(true);
            emailOtpRepository.save(challenge);
            throw new BadRequestException("Maximum verification attempts exceeded. Please log in again.");
        }

        // Compare entered OTP against BCrypt hash
        if (!passwordEncoder.matches(plainOtp, challenge.getOtpHash())) {
            int newAttempts = challenge.getFailedAttempts() + 1;
            challenge.setFailedAttempts(newAttempts);
            if (newAttempts >= MAX_FAILED_ATTEMPTS) {
                challenge.setUsed(true);
                emailOtpRepository.save(challenge);
                throw new BadRequestException("Maximum verification attempts exceeded. Please log in again.");
            }
            emailOtpRepository.save(challenge);
            int remaining = MAX_FAILED_ATTEMPTS - newAttempts;
            throw new BadRequestException("Invalid verification code. " + remaining + " attempt(s) remaining.");
        }

        // OTP Verified successfully: mark challenge used so it cannot be reused
        challenge.setUsed(true);
        emailOtpRepository.save(challenge);

        // Generate normal JWT and authenticate
        UserPrincipal userPrincipal = UserPrincipal.create(user);
        Authentication auth = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        String jwt = tokenProvider.generateToken(auth);

        Optional<Employee> employeeOpt = employeeRepository.findByUserId(user.getId());
        Long employeeId = employeeOpt.map(Employee::getId).orElse(null);

        auditLogRepository.save(new AuditLog(
                user.getUsername(),
                "EMPLOYEE_LOGIN_OTP_VERIFIED",
                httpRequest.getRemoteAddr(),
                "Employee successfully completed 2FA OTP verification"
        ));

        return ResponseEntity.ok(new AuthResponse(
                jwt,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                employeeId
        ));
    }

    @PostMapping("/resend-login-otp")
    @Transactional
    public ResponseEntity<?> resendLoginOtp(@Valid @RequestBody ResendLoginOtpRequest request) {
        String challengeId = request.getChallengeId().trim();

        EmailOtp challenge = emailOtpRepository.findByChallengeId(challengeId)
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification session. Please log in again."));

        if (challenge.isUsed()) {
            throw new BadRequestException("This verification session has expired. Please log in again.");
        }

        // 60-second resend cooldown check
        LocalDateTime lastSent = challenge.getLastSentAt() != null ? challenge.getLastSentAt() : challenge.getCreatedAt();
        long elapsedSeconds = Duration.between(lastSent, LocalDateTime.now()).getSeconds();
        if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
            long remaining = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
            throw new BadRequestException("Please wait " + remaining + " seconds before requesting another verification code.");
        }

        User user = userRepository.findById(challenge.getUserId())
                .orElseThrow(() -> new BadRequestException("Associated user account not found."));

        // Generate new secure 6-digit OTP
        int code = secureRandom.nextInt(1000000);
        String plainOtp = String.format("%06d", code);

        challenge.setOtpHash(passwordEncoder.encode(plainOtp));
        challenge.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        challenge.setLastSentAt(LocalDateTime.now());
        challenge.setFailedAttempts(0);
        emailOtpRepository.save(challenge);

        // Send new OTP email (Plain OTP is never logged)
        emailService.sendEmployeeLoginOtp(challenge.getEmail(), user.getFullName(), plainOtp);

        return ResponseEntity.ok(Map.of("message", "A new verification code has been sent to your email."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        if (userPrincipal == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
        }

        Optional<Employee> employeeOpt = employeeRepository.findByUserId(userPrincipal.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("id", userPrincipal.getId());
        response.put("username", userPrincipal.getUsername());
        response.put("email", userPrincipal.getEmail());
        response.put("fullName", userPrincipal.getFullName());
        response.put("role", userPrincipal.getRole());
        response.put("employee", employeeOpt.orElse(null));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "User logged out successfully"));
    }
}
