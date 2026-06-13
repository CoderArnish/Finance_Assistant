package com.todo.expencetracker2.service;

import com.todo.expencetracker2.dto.BudgetDTO;
import com.todo.expencetracker2.model.Budget;
import com.todo.expencetracker2.model.User;
import com.todo.expencetracker2.repository.BudgetRepository;
import com.todo.expencetracker2.repository.TransactionRepository;
import com.todo.expencetracker2.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository    budgetRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository       userRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<BudgetDTO> getAll() {
        User user = currentUser();
        return budgetRepository.findByUser(user)
                .stream()
                .map(b -> toDTO(b, user))
                .toList();
    }

    public BudgetDTO create(BudgetDTO dto) {
        User user = currentUser();
        Budget budget = Budget.builder()
                .name(dto.getName())
                .category(dto.getCategory())
                .limitAmount(dto.getLimitAmount())
                .period(dto.getPeriod())
                .user(user)
                .build();
        return toDTO(budgetRepository.save(budget), user);
    }

    public BudgetDTO update(Long id, BudgetDTO dto) {
        User user = currentUser();
        Budget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Budget not found"));

        if (!budget.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied: not your budget");
        }

        budget.setName(dto.getName());
        budget.setCategory(dto.getCategory());
        budget.setLimitAmount(dto.getLimitAmount());
        budget.setPeriod(dto.getPeriod());
        return toDTO(budgetRepository.save(budget), user);
    }

    public void delete(Long id) {
        User user = currentUser();
        Budget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Budget not found"));

        if (!budget.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied: not your budget");
        }
        budgetRepository.delete(budget);
    }

    private BudgetDTO toDTO(Budget budget, User user) {
        LocalDate today = LocalDate.now();
        LocalDate periodStart;

        if (budget.getPeriod() == Budget.BudgetPeriod.MONTHLY) {
            periodStart = today.withDayOfMonth(1);
        } else {
            // WEEKLY: back to last Monday
            periodStart = today.with(DayOfWeek.MONDAY);
        }

        double spent = transactionRepository
                .sumExpensesByUserAndCategoryBetween(user, budget.getCategory(), periodStart, today);

        double remaining  = budget.getLimitAmount() - spent;
        double percentage = budget.getLimitAmount() > 0
                ? (spent / budget.getLimitAmount()) * 100
                : 0.0;

        return BudgetDTO.builder()
                .id(budget.getId())
                .name(budget.getName())
                .category(budget.getCategory())
                .limitAmount(budget.getLimitAmount())
                .period(budget.getPeriod())
                .spent(spent)
                .remaining(remaining)
                .percentage(percentage)
                .build();
    }
}