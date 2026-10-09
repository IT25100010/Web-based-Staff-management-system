package com.lws.staff_management.config;

import com.lws.staff_management.security.JwtAuthenticationFilter;
import com.lws.staff_management.security.UserDetailsServiceImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(UserDetailsServiceImpl userDetailsService, JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e.authenticationEntryPoint((request, response, authException) -> {
                    response.sendError(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/api/health", "/error").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // IT Admin specific endpoints
                        .requestMatchers("/api/admin/**").hasAnyRole("IT_COORDINATOR", "HR_MANAGER", "SENIOR_ADMIN")

                        // Recruitment endpoints
                        .requestMatchers("/api/recruitment/**").hasAnyRole("HR_MANAGER", "SENIOR_ADMIN", "IT_COORDINATOR")

                        // Employee Self-Service Schedule & Recalls
                        .requestMatchers("/api/workforce/my-schedule", "/api/workforce/my-recalls").hasAnyRole("EMPLOYEE", "OPERATIONS_MANAGER", "HR_MANAGER", "IT_COORDINATOR", "SENIOR_ADMIN", "FINANCE_EXECUTIVE")

                        // Workforce & Shifts
                        .requestMatchers("/api/workforce/**").hasAnyRole("OPERATIONS_MANAGER", "HR_MANAGER", "IT_COORDINATOR", "SENIOR_ADMIN")

                        // Payroll endpoints
                        .requestMatchers("/api/payroll/process/**", "/api/payroll/preview/**", "/api/payroll/benefits/**").hasAnyRole("FINANCE_EXECUTIVE", "HR_MANAGER", "IT_COORDINATOR", "SENIOR_ADMIN")

                        // Any other API requires authentication
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
