package com.lws.staff_management.auth.service;

import com.lws.staff_management.exception.InternalServerErrorException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:lankaworkforcesolutions@gmail.com}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send professional employee login verification OTP code email.
     * Note: Plain OTP is never logged.
     */
    public void sendEmployeeLoginOtp(String toEmail, String employeeName, String otpCode) {
        try {
            String recipientGreeting = (employeeName != null && !employeeName.trim().isEmpty())
                    ? employeeName.trim()
                    : "Staff Member";

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("Lanka Workforce <" + fromEmail + ">");
            message.setTo(toEmail);
            message.setSubject("Lanka Workforce - Login Verification Code");
            message.setText("Hello " + recipientGreeting + ",\n\n" +
                    "A login attempt was made to your Lanka Workforce employee account.\n\n" +
                    "Your verification code is:\n\n" +
                    otpCode + "\n\n" +
                    "This code will expire in 5 minutes.\n\n" +
                    "If you did not attempt to login, you can ignore this email.\n\n" +
                    "Lanka Workforce Solutions");

            mailSender.send(message);
            log.info("Employee login OTP verification email dispatched to recipient: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send login verification email to recipient {}: {}", toEmail, e.getMessage());
            throw new InternalServerErrorException("Failed to send verification email. Please try again later.");
        }
    }
}
