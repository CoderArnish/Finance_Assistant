package com.todo.expencetracker2.repository;

import com.todo.expencetracker2.model.Account;
import com.todo.expencetracker2.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findByUser(User user);
}