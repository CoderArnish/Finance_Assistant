import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { TrendingUp, Loader2, CheckCircle, ArrowLeft, AlertTriangle, Eye, EyeOff } from 'lucide-react';

// ── Both components OUTSIDE ForgotPassword to prevent remount on keystroke ──

const PasswordInput = ({ id, value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="input-field pr-10"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const Shell = ({ title, subtitle, onSubmit, error, children }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-center gap-2 mb-8">
        <TrendingUp className="w-7 h-7 text-primary-600" />
        <span className="text-2xl font-bold text-gray-900">ExpenseTracker</span>
      </div>

      <div className="card">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{subtitle}</p>

        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {children}
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link to="/login" className="flex items-center justify-center gap-1 text-primary-600 hover:underline font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </Link>
      </p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const ForgotPassword = () => {
  const [step, setStep]                       = useState('request');
  const [email, setEmail]                     = useState('');
  const [otp, setOtp]                         = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  const clearError = () => setError('');

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true); clearError();
    try {
      await authAPI.forgotPassword({ email: email.trim() });
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 4) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    setLoading(true); clearError();
    try {
      await authAPI.verifyOtp({ email: email.trim(), otp: otp.trim() });
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true); clearError();
    try {
      await authAPI.resetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please start over.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm card text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Password Reset!</h1>
          <p className="text-sm text-gray-500">Your password has been updated. You can now log in with your new password.</p>
          <Link to="/login" className="btn-primary block text-center">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'request') {
    return (
      <Shell title="Forgot Password" subtitle="Enter your registered email and we'll send you a reset code." onSubmit={handleRequestOtp} error={error}>
        <div>
          <label className="label" htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            autoFocus
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Sending…' : 'Send Reset Code'}
        </button>
      </Shell>
    );
  }

  if (step === 'verify') {
    return (
      <Shell title="Enter Reset Code" subtitle={`We sent a 6-digit code to ${email}. Check your inbox (and spam folder).`} onSubmit={handleVerifyOtp} error={error}>
        <div>
          <label className="label" htmlFor="otp">6-Digit Code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="input-field tracking-widest text-center text-lg font-mono"
            placeholder="000000"
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); clearError(); }}
            autoFocus
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>
        <button type="button" onClick={() => { setStep('request'); clearError(); }} className="btn-secondary w-full text-sm">
          Use a different email
        </button>
      </Shell>
    );
  }

  // step === 'reset'
  return (
    <Shell title="Set New Password" subtitle="Choose a strong password you haven't used before." onSubmit={handleResetPassword} error={error}>
      <div>
        <label className="label" htmlFor="newPassword">New Password</label>
        <PasswordInput
          id="newPassword"
          value={newPassword}
          placeholder="Min. 6 characters"
          onChange={(e) => { setNewPassword(e.target.value); clearError(); }}
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmPassword">Confirm Password</label>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          placeholder="Repeat new password"
          onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Resetting…' : 'Reset Password'}
      </button>
    </Shell>
  );
};

export default ForgotPassword;