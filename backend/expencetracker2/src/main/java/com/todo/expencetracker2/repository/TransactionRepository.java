package com.todo.expencetracker2.repository;

import com.todo.expencetracker2.model.Transaction;
import com.todo.expencetracker2.model.Transaction.TransactionType;
import com.todo.expencetracker2.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserOrderByDateDesc(User user);

    List<Transaction> findByUserAndTypeOrderByDateDesc(User user, TransactionType type);

    List<Transaction> findByUserAndCategoryOrderByDateDesc(User user, String category);

    @Query("SELECT t FROM Transaction t WHERE t.user = :user " +
            "AND (:category IS NULL OR t.category = :category) " +
            "AND (:type IS NULL OR t.type = :type) " +
            "AND (:startDate IS NULL OR t.date >= :startDate) " +
            "AND (:endDate IS NULL OR t.date <= :endDate) " +
            "ORDER BY t.date DESC")
    List<Transaction> findByUserWithFilters(
            @Param("user")      User             user,
            @Param("category")  String           category,
            @Param("type")      TransactionType  type,
            @Param("startDate") LocalDate        startDate,
            @Param("endDate")   LocalDate        endDate
    );

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.user = :user AND t.type = :type")
    Double sumByUserAndType(
            @Param("user") User user,
            @Param("type") TransactionType type
    );

    // ── NEW ── used by BudgetService to compute spending per budget period
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.user = :user " +
            "AND t.type = 'EXPENSE' " +
            "AND t.category = :category " +
            "AND t.date >= :startDate " +
            "AND t.date <= :endDate")
    Double sumExpensesByUserAndCategoryBetween(
            @Param("user")      User      user,
            @Param("category")  String    category,
            @Param("startDate") LocalDate startDate,
            @Param("endDate")   LocalDate endDate
    );
}