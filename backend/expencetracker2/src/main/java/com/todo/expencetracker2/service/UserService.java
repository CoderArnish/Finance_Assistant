package com.todo.expencetracker2.service;

import com.todo.expencetracker2.dto.ChangePasswordRequest;
import com.todo.expencetracker2.dto.UpdateProfileRequest;
import com.todo.expencetracker2.dto.UserDTO;
import com.todo.expencetracker2.model.User;
import com.todo.expencetracker2.repository.UserRepository;
import com.todo.expencetracker2.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public UserDTO updateProfile(UpdateProfileRequest request) {
        User user = currentUser();

        // If email changed, check it's not already taken by another account
        if (!user.getEmail().equalsIgnoreCase(request.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new IllegalArgumentException("Email is already in use by another account.");
            }
        }

        user.setName(request.getName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        User saved = userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(saved.getEmail());
        String newToken = jwtUtil.generateToken(userDetails);

        return UserDTO.builder()
                .id(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .token(newToken)
                .build();
    }

    public void changePassword(ChangePasswordRequest request) {
        User user = currentUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public void deleteAccount() {
        User user = currentUser();
        userRepository.delete(user);
    }
}