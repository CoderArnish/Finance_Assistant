package com.todo.expencetracker2.controller;

import com.todo.expencetracker2.dto.*;
import com.todo.expencetracker2.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password"));
        }
    }

    // ── Forgot Password flow ──────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            authService.sendPasswordResetOtp(request.getEmail());
            // Always return 200 — don't reveal whether email exists
            return ResponseEntity.ok(Map.of("message", "If that email is registered, a reset code has been sent."));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("message", "If that email is registered, a reset code has been sent."));
        }
    }

    // new registration email conformation flow

    @PostMapping("/send-registration-otp")
    public ResponseEntity<?> sendRegistrationOtp(
           @Valid @RequestBody RegistrationOtpRequest request) {

        authService.sendRegistrationOtp(
                request.getName(),
                request.getEmail()
        );

        return ResponseEntity.ok(
                Map.of("message", "OTP sent successfully.")
        );
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        try {
            authService.verifyOtp(request.getEmail(), request.getOtp());
            return ResponseEntity.ok(Map.of("message", "Code verified"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}