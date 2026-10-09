import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Two-step Employee OTP state
  const [otpRequired, setOtpRequired] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  const otpInputsRef = useRef([]);
  const { login, completeOtpLogin, loading } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus the first OTP input when entering the OTP view
  useEffect(() => {
    if (otpRequired && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [otpRequired]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    try {
      const response = await login(username, password);

      // Check if backend returned 2-step OTP challenge for EMPLOYEE
      if (response && response.requiresOtp) {
        setChallengeId(response.challengeId);
        setOtpRequired(true);
        setCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
        setInfoMessage(response.message || 'A 6-digit verification code was sent to your registered email.');
        return;
      }

      // Non-employee (or instant login): redirect based on role
      redirectForRole(response.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password');
    }
  };

  const redirectForRole = (r) => {
    switch (r) {
      case 'HR_MANAGER': navigate('/hr/dashboard'); break;
      case 'OPERATIONS_MANAGER': navigate('/operations/dashboard'); break;
      case 'SENIOR_ADMIN': navigate('/admin-officer/dashboard'); break;
      case 'FINANCE_EXECUTIVE': navigate('/finance/dashboard'); break;
      case 'EMPLOYEE': navigate('/employee/dashboard'); break;
      case 'IT_COORDINATOR': navigate('/it/dashboard'); break;
      default: navigate('/');
    }
  };

  // Handle individual OTP digit entry
  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, ''); // Numbers only
    const newDigits = [...otpDigits];

    if (!digit) {
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    newDigits[index] = digit.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  // Step 2: Verify Login OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setVerifyingOtp(true);
    setError('');

    try {
      const res = await apiClient.post('/auth/verify-login-otp', {
        challengeId,
        otp: code,
      });

      const userData = completeOtpLogin(res.data);
      redirectForRole(userData.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resendingOtp) return;
    setResendingOtp(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await apiClient.post('/auth/resend-login-otp', {
        challengeId,
      });
      setInfoMessage(res.data?.message || 'A new verification code has been sent to your email.');
      setCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setResendingOtp(false);
    }
  };

  const handleBackToLogin = () => {
    setOtpRequired(false);
    setChallengeId('');
    setOtpDigits(['', '', '', '', '', '']);
    setError('');
    setInfoMessage('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f2b48 0%, #1e3a8a 50%, #0f172a 100%)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        background: '#ffffff',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Left Side: Brand Story */}
        <div style={{
          background: 'linear-gradient(145deg, #0f2b48, #1e3a8a)',
          padding: '48px 40px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#38bdf8',
              marginBottom: '28px'
            }}>
              <Shield size={14} /> Enterprise Staff HRIS Platform
            </div>

            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Lanka Workforce Solutions
            </h1>
            <p style={{ fontSize: '1rem', color: '#94a3b8', marginTop: '12px', lineHeight: 1.6 }}>
              Centralized web-based workforce operations, shift logistics, automated payroll calculations, and compliance governance.
            </p>

            <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.875rem', color: '#e2e8f0' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                Automated Biometric Attendance & Shift Scheduling
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.875rem', color: '#e2e8f0' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></span>
                Real-Time Work Location & Transfer Tracking
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.875rem', color: '#e2e8f0' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                Sri Lanka EPF / ETF Compliant Payroll Processing
              </div>
            </div>
          </div>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: '#94a3b8' }}>
            © 2026 Lanka Workforce Solutions (Pvt) Ltd. All Rights Reserved.
          </div>
        </div>

        {/* Right Side: Login Form or Employee OTP Verification View */}
        <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {otpRequired ? (
            /* Employee 2-Step Login OTP View */
            <div>
              <button
                type="button"
                onClick={handleBackToLogin}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginBottom: '20px'
                }}
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>

              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <KeyRound size={24} />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Verify Your Login</h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px', marginBottom: '20px', lineHeight: 1.5 }}>
                A 6-digit verification code was sent to your registered email. Enter it below to access your workspace.
              </p>

              {infoMessage && (
                <div style={{
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  color: '#166534',
                  fontSize: '0.875rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{infoMessage}</span>
                </div>
              )}

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>
                    6-Digit Verification Code
                  </label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        style={{
                          width: '46px',
                          height: '52px',
                          textAlign: 'center',
                          fontSize: '1.35rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: '2px solid #cbd5e1',
                          outline: 'none',
                          color: '#0f172a',
                          background: '#f8fafc',
                          transition: 'all 0.15s ease'
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                        onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', height: '44px', fontSize: '0.95rem', marginBottom: '16px' }}
                  disabled={verifyingOtp || otpDigits.join('').length !== 6}
                >
                  {verifyingOtp ? 'Verifying Code...' : 'Verify & Enter Workspace'} <ArrowRight size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  {cooldown > 0 ? (
                    <span style={{ color: '#64748b' }}>
                      Resend Code in <strong>{cooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendingOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: 0
                      }}
                    >
                      <RefreshCw size={14} className={resendingOtp ? 'animate-spin' : ''} />
                      {resendingOtp ? 'Sending...' : 'Resend Verification Code'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            /* Standard Login Form */
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Sign in to System</h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px', marginBottom: '24px' }}>
                Enter your corporate credentials to access your workspace
              </p>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  marginBottom: '20px'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Username or Corporate Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '38px', height: '44px' }}
                      placeholder="Enter username or email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="password"
                      className="form-control"
                      style={{ paddingLeft: '38px', height: '44px' }}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', height: '44px', fontSize: '0.95rem' }}
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
