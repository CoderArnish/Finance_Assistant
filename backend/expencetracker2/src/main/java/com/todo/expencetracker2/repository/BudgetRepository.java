package com.todo.expencetracker2.repository;

import com.todo.expencetracker2.model.Budget;
import com.todo.expencetracker2.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUser(User user);
}