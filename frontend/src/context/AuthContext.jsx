import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      fetchCurrentUser();
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (err) {
      console.warn('Could not fetch me info:', err);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      if (res.data?.requiresOtp) {
        return res.data;
      }
      const { token, ...userData } = res.data;
      setToken(token);
      setUser(userData);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const completeOtpLogin = (authData) => {
    const { token, ...userData } = authData;
    setToken(token);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const switchDemoRole = async (roleName) => {
    setLoading(true);
    const demoAccounts = {
      HR_MANAGER: { username: "hr_manager", email: "hr@lankaworkforce.com", fullName: "HR Manager", role: "HR_MANAGER" },
      OPERATIONS_MANAGER: { username: "ops_manager", email: "ops@lankaworkforce.com", fullName: "Operations Manager", role: "OPERATIONS_MANAGER" },
      SENIOR_ADMIN: { username: "senior_admin", email: "admin@lankaworkforce.com", fullName: "Senior Admin", role: "SENIOR_ADMIN" },
      FINANCE_EXECUTIVE: { username: "finance_exec", email: "finance@lankaworkforce.com", fullName: "Finance Executive", role: "FINANCE_EXECUTIVE" },
      EMPLOYEE: { username: "employee_user", email: "emp@lankaworkforce.com", fullName: "Staff Member", role: "EMPLOYEE" },
      IT_COORDINATOR: { username: "it_coordinator", email: "it@lankaworkforce.com", fullName: "IT Coordinator", role: "IT_COORDINATOR" }
    };

    const target = demoAccounts[roleName] || demoAccounts.HR_MANAGER;
    try {
      // Attempt login via API client
      const res = await apiClient.post('/auth/login', { username: target.username, password: "Password@123" });
      const { token, ...userData } = res.data;
      setToken(token);
      setUser(userData);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (e) {
      // Direct demo mock switch
      const mockToken = "mock-jwt-" + target.role;
      const userData = { id: 1, ...target, token: mockToken };
      setToken(mockToken);
      setUser(userData);
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      apiClient.post('/auth/logout');
    } catch (e) {}
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasRole = (...allowedRoles) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  const role = user?.role || null;
  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, role, isAuthenticated, loading, login, completeOtpLogin, logout, switchDemoRole, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
