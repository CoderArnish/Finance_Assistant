import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { userAPI } from '../services/api';
import {
  User, Lock, Trash2, Loader2, CheckCircle, Eye, EyeOff, AlertTriangle,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
const Field = ({ label, id, error, children }) => (
  <div>
    <label className="label" htmlFor={id}>{label}</label>
    {children}
    {error && <p className="error-text">{error}</p>}
  </div>
);

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

const Toast = ({ msg, type }) => {
  if (!msg) return null;
  const isError = type === 'error';
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
      ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
      {isError
        ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
      {msg}
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────
const Settings = () => {
  const { user, login, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── profile section state ──
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileToast, setProfileToast] = useState({ msg: '', type: '' });

  // ── password section state ──
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordToast, setPasswordToast] = useState({ msg: '', type: '' });

  // ── delete section state ──
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteToast, setDeleteToast] = useState({ msg: '', type: '' });
  const [showDeletePanel, setShowDeletePanel] = useState(false);

  // ── toast helper ──
  const flash = (setter, msg, type = 'success') => {
    setter({ msg, type });
    setTimeout(() => setter({ msg: '', type: '' }), 4000);
  };

  // ── profile update ──
  const validateProfile = () => {
    const e = {};
    if (!profile.name.trim()) e.name = 'Name is required';
    if (!profile.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(profile.email)) e.email = 'Enter a valid email';
    return e;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const errs = validateProfile();
    if (Object.keys(errs).length) { setProfileErrors(errs); return; }
    setProfileErrors({});
    setProfileLoading(true);
    try {
      const res = await userAPI.updateProfile({ name: profile.name.trim(), email: profile.email.trim() });
      // update localStorage so Navbar reflects the new name
      if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
      login(res.data.token ||localStorage.getItem('token'), res.data);
      flash(setProfileToast, 'Profile updated successfully.');
    } catch (err) {
      flash(setProfileToast, err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── password update ──
  const validatePasswords = () => {
    const e = {};
    if (!passwords.currentPassword) e.currentPassword = 'Current password is required';
    if (!passwords.newPassword) e.newPassword = 'New password is required';
    else if (passwords.newPassword.length < 6) e.newPassword = 'Must be at least 6 characters';
    if (!passwords.confirmPassword) e.confirmPassword = 'Please confirm your new password';
    else if (passwords.newPassword !== passwords.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = validatePasswords();
    if (Object.keys(errs).length) { setPasswordErrors(errs); return; }
    setPasswordErrors({});
    setPasswordLoading(true);
    try {
      await userAPI.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      flash(setPasswordToast, 'Password changed successfully.');
    } catch (err) {
      flash(setPasswordToast, err.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── delete account ──
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      flash(setDeleteToast, 'Email does not match. Please type your email exactly.', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      await userAPI.deleteAccount();
      logout();
    } catch (err) {
      flash(setDeleteToast, err.response?.data?.message || 'Failed to delete account.', 'error');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-6">

            <div>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your account details and security</p>
            </div>

            {/* ── Profile ── */}
            <section className="card">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Profile</h2>
                  <p className="text-xs text-gray-500">Update your name and email address</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} noValidate className="space-y-4">
                <Field label="Full Name" id="name" error={profileErrors.name}>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="input-field"
                    value={profile.name}
                    onChange={(e) => {
                      setProfile((p) => ({ ...p, name: e.target.value }));
                      if (profileErrors.name) setProfileErrors((p) => ({ ...p, name: '' }));
                    }}
                    placeholder="Your full name"
                  />
                </Field>

                <Field label="Email Address" id="email" error={profileErrors.email}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="input-field"
                    value={profile.email}
                    onChange={(e) => {
                      setProfile((p) => ({ ...p, email: e.target.value }));
                      if (profileErrors.email) setProfileErrors((p) => ({ ...p, email: '' }));
                    }}
                    placeholder="you@example.com"
                  />
                </Field>

                {profileToast.msg && <Toast msg={profileToast.msg} type={profileToast.type} />}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {profileLoading ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </section>

            {/* ── Change Password ── */}
            <section className="card">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
                  <p className="text-xs text-gray-500">Use a strong password you don't use elsewhere</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
                <Field label="Current Password" id="currentPassword" error={passwordErrors.currentPassword}>
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    value={passwords.currentPassword}
                    placeholder="Enter current password"
                    onChange={(e) => {
                      setPasswords((p) => ({ ...p, currentPassword: e.target.value }));
                      if (passwordErrors.currentPassword) setPasswordErrors((p) => ({ ...p, currentPassword: '' }));
                    }}
                  />
                </Field>

                <Field label="New Password" id="newPassword" error={passwordErrors.newPassword}>
                  <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    value={passwords.newPassword}
                    placeholder="Min. 6 characters"
                    onChange={(e) => {
                      setPasswords((p) => ({ ...p, newPassword: e.target.value }));
                      if (passwordErrors.newPassword) setPasswordErrors((p) => ({ ...p, newPassword: '' }));
                    }}
                  />
                </Field>

                <Field label="Confirm New Password" id="confirmPassword" error={passwordErrors.confirmPassword}>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    placeholder="Repeat new password"
                    onChange={(e) => {
                      setPasswords((p) => ({ ...p, confirmPassword: e.target.value }));
                      if (passwordErrors.confirmPassword) setPasswordErrors((p) => ({ ...p, confirmPassword: '' }));
                    }}
                  />
                </Field>

                {passwordToast.msg && <Toast msg={passwordToast.msg} type={passwordToast.type} />}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {passwordLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </form>
            </section>

            {/* ── Danger Zone ── */}
            <section className="card border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Delete Account</h2>
                  <p className="text-xs text-gray-500">Permanently delete your account and all data</p>
                </div>
              </div>

              {!showDeletePanel ? (
                <button
                  type="button"
                  onClick={() => setShowDeletePanel(true)}
                  className="btn-danger text-sm"
                >
                  Delete My Account
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <strong>This cannot be undone.</strong> All your transactions, accounts, and budgets will be permanently deleted.
                  </div>

                  <Field label={`Type your email (${user?.email}) to confirm`} id="deleteConfirm">
                    <input
                      id="deleteConfirm"
                      type="email"
                      className="input-field border-red-200 focus:ring-red-400"
                      placeholder={user?.email}
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                    />
                  </Field>

                  {deleteToast.msg && <Toast msg={deleteToast.msg} type={deleteToast.type} />}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowDeletePanel(false); setDeleteConfirm(''); }}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || deleteConfirm !== user?.email}
                      className="btn-danger text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {deleteLoading ? 'Deleting…' : 'Permanently Delete Account'}
                    </button>
                  </div>
                </div>
              )}
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
