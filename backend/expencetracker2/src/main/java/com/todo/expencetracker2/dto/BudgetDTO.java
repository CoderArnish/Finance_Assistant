package com.todo.expencetracker2.dto;

import com.todo.expencetracker2.model.Budget;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BudgetDTO {

    private Long id;
    private String name;
    private String category;
    private Double limitAmount;
    private Budget.BudgetPeriod period;

    // Computed on read — not persisted
    private Double spent;
    private Double remaining;
    private Double percentage;
}