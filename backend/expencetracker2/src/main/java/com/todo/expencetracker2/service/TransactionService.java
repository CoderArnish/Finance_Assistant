package com.todo.expencetracker2.service;

import com.todo.expencetracker2.dto.TransactionDTO;
import com.todo.expencetracker2.model.Transaction;
import com.todo.expencetracker2.model.Transaction.TransactionType;
import com.todo.expencetracker2.model.User;
import com.todo.expencetracker2.repository.TransactionRepository;
import com.todo.expencetracker2.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<TransactionDTO> getAllTransactions(String category, String type, LocalDate startDate, LocalDate endDate) {
        User user = getCurrentUser();
        TransactionType transactionType = null;

        if (type != null && !type.isEmpty()) {
            try {
                transactionType = TransactionType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid transaction type: " + type);
            }
        }

        List<Transaction> transactions = transactionRepository.findByUserWithFilters(
                user,
                (category != null && !category.isEmpty()) ? category : null,
                transactionType,
                startDate,
                endDate
        );

        return transactions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public TransactionDTO createTransaction(TransactionDTO dto) {
        User user = getCurrentUser();

        Transaction transaction = Transaction.builder()
                .amount(dto.getAmount())
                .type(dto.getType())
                .category(dto.getCategory())
                .date(dto.getDate())
                .description(dto.getDescription())
                .user(user)
                .build();

        Transaction saved = transactionRepository.save(transaction);
        return toDTO(saved);
    }

    public TransactionDTO updateTransaction(Long id, TransactionDTO dto) {
        User user = getCurrentUser();

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied: not your transaction");
        }

        transaction.setAmount(dto.getAmount());
        transaction.setType(dto.getType());
        transaction.setCategory(dto.getCategory());
        transaction.setDate(dto.getDate());
        transaction.setDescription(dto.getDescription());

        Transaction updated = transactionRepository.save(transaction);
        return toDTO(updated);
    }

    public void deleteTransaction(Long id) {
        User user = getCurrentUser();

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied: not your transaction");
        }

        transactionRepository.delete(transaction);
    }

    public Map<String, Double> getSummary() {
        User user = getCurrentUser();

        double totalIncome = transactionRepository.sumByUserAndType(user, TransactionType.INCOME);
        double totalExpense = transactionRepository.sumByUserAndType(user, TransactionType.EXPENSE);
        double balance = totalIncome - totalExpense;

        return Map.of(
                "totalIncome", totalIncome,
                "totalExpense", totalExpense,
                "balance", balance
        );
    }

    private TransactionDTO toDTO(Transaction t) {
        return TransactionDTO.builder()
                .id(t.getId())
                .amount(t.getAmount())
                .type(t.getType())
                .category(t.getCategory())
                .date(t.getDate())
                .description(t.getDescription())
                .build();
    }
}