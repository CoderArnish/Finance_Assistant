package com.todo.expencetracker2.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendOtpEmail(String name, String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Your ExpenseTracker Password Reset Code");
            message.setText(
                    "Hi " + name + ",\n\n" +
                            "Your password reset code is:\n\n" +
                            "  " + otp + "\n\n" +
                            "This code expires in 10 minutes.\n\n" +
                            "If you didn't request this, you can safely ignore this email.\n\n" +
                            "— ExpenseTracker"
            );
            mailSender.send(message);
            log.info("OTP email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send email. Please try again.");
        }
    }
}