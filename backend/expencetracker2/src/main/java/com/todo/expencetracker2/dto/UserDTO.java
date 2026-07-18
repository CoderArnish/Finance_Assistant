package com.todo.expencetracker2.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDTO {
    private Long   id;
    private String name;
    private String email;
    private String token;
}