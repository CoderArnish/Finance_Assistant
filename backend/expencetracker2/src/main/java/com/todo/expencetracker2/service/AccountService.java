package com.todo.expencetracker2.service;

import com.todo.expencetracker2.dto.AccountDTO;
import com.todo.expencetracker2.model.Account;
import com.todo.expencetracker2.model.User;
import com.todo.expencetracker2.repository.AccountRepository;
import com.todo.expencetracker2.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository    userRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }

    public List<AccountDTO> getAccounts() {
        return accountRepository.findByUser(currentUser())
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public AccountDTO create(AccountDTO dto) {
        Account account = Account.builder()
                .name(dto.getName())
                .type(dto.getType())
                .balance(dto.getBalance())
                .user(currentUser())
                .build();
        return toDTO(accountRepository.save(account));
    }

    // ── NEW ──
    public AccountDTO update(Long id, AccountDTO dto) {
        User user = currentUser();
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!account.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied: not your account");
        }

        account.setName(dto.getName());
        account.setType(dto.getType());
        account.setBalance(dto.getBalance());
        return toDTO(accountRepository.save(account));
    }

    // ── NEW ──
    public void delete(Long id) {
        User user = currentUser();
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!account.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied: not your account");
        }
        accountRepository.delete(account);
    }

    /**
     * FIXED: credit cards are liabilities — their balance is subtracted from net worth.
     * e.g. BANK ₹50,000 + CASH ₹5,000 − CREDIT_CARD ₹8,000 = ₹47,000 net worth
     */
    public Double getNetWorth() {
        return accountRepository.findByUser(currentUser())
                .stream()
                .mapToDouble(account ->
                        account.getType() == Account.AccountType.CREDIT_CARD
                                ? -account.getBalance()
                                : account.getBalance()
                )
                .sum();
    }

    private AccountDTO toDTO(Account account) {
        return AccountDTO.builder()
                .id(account.getId())
                .name(account.getName())
                .type(account.getType())
                .balance(account.getBalance())
                .build();
    }
}