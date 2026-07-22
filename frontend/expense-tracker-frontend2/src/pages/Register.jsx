import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

// ── Outside component to prevent remount on keystroke ──
const PasswordInput = ({ id, name, value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        className="input-field pr-10"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
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

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // step: 'form' | 'verify'
  const [step, setStep] = useState('form');

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [otp, setOtp]             = useState('');
  const [errors, setErrors]       = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading]     = useState(false);

  const validate = () => {
    const e = {};
    if (!formData.name.trim())       e.name    = 'Name is required';
    if (!formData.email.trim())      e.email   = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Invalid email format';
    if (!formData.password)          e.password = 'Password is required';
    else if (formData.password.length < 6) e.password = 'Must be at least 6 characters';
    if (!formData.confirmPassword)   e.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
    setServerError('');
  };

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError('');
    try {
      await authAPI.sendRegistrationOtp({ name: formData.name.trim(),email: formData.email.trim() });
      setStep('verify');
    } catch (err) {
      // Send OTP for email verification
      setServerError(err.response?.data?.message || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP then register ─────────────────────────────────────
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 6) {
      setServerError('Enter the 6-digit code sent to your email.');
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      // Verify OTP first
      await authAPI.verifyOtp({ email: formData.email.trim(), otp: otp.trim() });
      // If OTP valid, create account
      const res = await authAPI.register({
        name:     formData.name.trim(),
        email:    formData.email.trim(),
        password: formData.password,
      });
      login(res.data.token, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared shell ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <TrendingUp className="w-7 h-7 text-primary-600" />
          <span className="text-2xl font-bold text-gray-900">ExpenseTracker</span>
        </div>

        <div className="card">
          {step === 'form' ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Create account</h1>
              <p className="text-sm text-gray-500 mb-6">We'll send a code to verify your email</p>

              {serverError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSendOtp} noValidate className="space-y-4">
                <div>
                  <label className="label" htmlFor="name">Full Name</label>
                  <input
                    id="name" name="name" type="text" className="input-field"
                    placeholder="Your full name"
                    value={formData.name} onChange={handleChange} autoFocus
                  />
                  {errors.name && <p className="error-text">{errors.name}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email" name="email" type="email" className="input-field"
                    placeholder="you@example.com"
                    value={formData.email} onChange={handleChange}
                  />
                  {errors.email && <p className="error-text">{errors.email}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="password">Password</label>
                  <PasswordInput
                    id="password" name="password"
                    placeholder="Min. 6 characters"
                    value={formData.password} onChange={handleChange}
                  />
                  {errors.password && <p className="error-text">{errors.password}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                  <PasswordInput
                    id="confirmPassword" name="confirmPassword"
                    placeholder="Repeat password"
                    value={formData.confirmPassword} onChange={handleChange}
                  />
                  {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending Code…' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Verify your email</h1>
                  <p className="text-xs text-gray-500">Code sent to {formData.email}</p>
                </div>
              </div>

              {serverError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleVerifyAndRegister} noValidate className="space-y-4">
                <div>
                  <label className="label" htmlFor="otp">6-Digit Code</label>
                  <input
                    id="otp" type="text" inputMode="numeric" maxLength={6}
                    className="input-field tracking-widest text-center text-lg font-mono"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setServerError(''); }}
                    autoFocus
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Creating Account…' : 'Verify & Create Account'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('form'); setOtp(''); setServerError(''); }}
                  className="btn-secondary w-full text-sm"
                >
                  ← Change email or details
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
