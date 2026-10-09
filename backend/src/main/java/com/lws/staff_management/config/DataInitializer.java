package com.lws.staff_management.config;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, EmployeeRepository employeeRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() == 0) {
            System.out.println(">>> Initializing Clean System Role Accounts (All data sections start empty)...");

            String pass = passwordEncoder.encode("Password@123");
            userRepository.save(new User("hr_manager", "hr@lankaworkforce.com", pass, "HR Manager", Role.HR_MANAGER));
            userRepository.save(new User("ops_manager", "ops@lankaworkforce.com", pass, "Operations Manager", Role.OPERATIONS_MANAGER));
            userRepository.save(new User("senior_admin", "admin@lankaworkforce.com", pass, "Senior Admin", Role.SENIOR_ADMIN));
            userRepository.save(new User("finance_exec", "finance@lankaworkforce.com", pass, "Finance Executive", Role.FINANCE_EXECUTIVE));
            userRepository.save(new User("employee_user", "emp@lankaworkforce.com", pass, "Staff Member", Role.EMPLOYEE));
            userRepository.save(new User("it_coordinator", "it@lankaworkforce.com", pass, "IT Coordinator", Role.IT_COORDINATOR));

            System.out.println(">>> Clean Authentication Users Initialized. Zero sample records exist.");
        }

        // Backfill user accounts for any existing employees that are unlinked
        List<Employee> unlinked = employeeRepository.findAll().stream().filter(e -> e.getUser() == null).toList();
        for (Employee emp : unlinked) {
            String email = emp.getEmail() != null ? emp.getEmail().trim().toLowerCase() : null;
            if (email == null || email.isEmpty()) {
                continue;
            }
            User u = userRepository.findByUsernameOrEmailIgnoreCase(email, email)
                    .orElseGet(() -> {
                        User newUser = new User();
                        newUser.setUsername(email);
                        newUser.setEmail(email);
                        newUser.setFullName(emp.getFullName());
                        String nic = emp.getNic() != null ? emp.getNic().trim() : "123456789V";
                        newUser.setPassword(passwordEncoder.encode(nic));
                        newUser.setRole(Role.EMPLOYEE);
                        newUser.setActive(!"Inactive".equalsIgnoreCase(emp.getEmploymentStatus()) && !"Terminated".equalsIgnoreCase(emp.getEmploymentStatus()));
                        return userRepository.save(newUser);
                    });
            emp.setUser(u);
            employeeRepository.save(emp);
        }
    }
}
