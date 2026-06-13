package com.todo.expencetracker2.dto;

import com.todo.expencetracker2.model.Account.AccountType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountDTO {

    private Long id;

    private String name;

    private AccountType type;

    private Double balance;
}