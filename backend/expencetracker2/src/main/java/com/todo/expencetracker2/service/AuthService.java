package com.todo.expencetracker2.service;

import com.todo.expencetracker2.dto.AuthRequest;
import com.todo.expencetracker2.dto.AuthResponse;
import com.todo.expencetracker2.dto.RegisterRequest;
import com.todo.expencetracker2.model.User;
import com.todo.expencetracker2.repository.UserRepository;
import com.todo.expencetracker2.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JwtUtil               jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService    userDetailsService;
    private final EmailService          emailService;

    // ── In-memory OTP store: email → {otp, expiry} ──────────────────────────
    // For production you'd persist this in Redis or a DB table.
    private record OtpEntry(String otp, LocalDateTime expiry) {}
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private static final int OTP_VALID_MINUTES = 10;

    // ── Register ─────────────────────────────────────────────────────────────
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered.");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .build())
                .build();
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .build())
                .build();
    }

    // ── Forgot Password: send OTP ─────────────────────────────────────────────
    public void sendPasswordResetOtp(String email) {
        // Silently return if email not found (don't reveal account existence)
        userRepository.findByEmail(email.toLowerCase()).ifPresent(user -> {
            String otp = String.format("%06d", new Random().nextInt(1_000_000));
            otpStore.put(email.toLowerCase(), new OtpEntry(otp, LocalDateTime.now().plusMinutes(OTP_VALID_MINUTES)));
            emailService.sendOtpEmail(user.getName(), email, otp);
        });
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    public void verifyOtp(String email, String otp) {
        OtpEntry entry = otpStore.get(email.toLowerCase());
        if (entry == null || LocalDateTime.now().isAfter(entry.expiry())) {
            throw new IllegalArgumentException("Code has expired. Please request a new one.");
        }
        if (!entry.otp().equals(otp)) {
            throw new IllegalArgumentException("Invalid code. Please check and try again.");
        }
        // OTP is valid — don't remove yet; resetPassword will consume it
    }

    // ── Reset Password ────────────────────────────────────────────────────────
    public void resetPassword(String email, String otp, String newPassword) {
        // Re-verify OTP before changing password
        verifyOtp(email, otp);

        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Consume the OTP so it can't be reused
        otpStore.remove(email.toLowerCase());
    }
}