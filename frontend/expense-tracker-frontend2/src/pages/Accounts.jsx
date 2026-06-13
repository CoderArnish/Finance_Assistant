import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { accountAPI } from '../services/api';
import {
  Plus, Pencil, Trash2, X, Loader2,
  Landmark, Banknote, CreditCard, Smartphone, Wallet,
} from 'lucide-react';

const ACCOUNT_TYPES = ['BANK', 'CASH', 'UPI', 'WALLET', 'CREDIT_CARD'];

const EMPTY_FORM = { name: '', type: 'BANK', balance: '' };

const fmt = (v) =>
  Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_META = {
  BANK:        { label: 'Bank Account',  Icon: Landmark,    color: 'text-blue-500',    bg: 'bg-blue-50'    },
  CASH:        { label: 'Cash',          Icon: Banknote,    color: 'text-emerald-500', bg: 'bg-emerald-50' },
  UPI:         { label: 'UPI',           Icon: Smartphone,  color: 'text-purple-500',  bg: 'bg-purple-50'  },
  WALLET:      { label: 'Wallet',        Icon: Wallet,      color: 'text-amber-500',   bg: 'bg-amber-50'   },
  CREDIT_CARD: { label: 'Credit Card',   Icon: CreditCard,  color: 'text-red-500',     bg: 'bg-red-50'     },
};

/* ─── Inline form (rendered inside Modal) ─── */
const AccountForm = ({ account, onSuccess, onCancel }) => {
  const isEditing = Boolean(account);

  const [form, setForm] = useState(
    isEditing
      ? { name: account.name, type: account.type, balance: String(account.balance) }
      : EMPTY_FORM
  );
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Account name is required';
    if (form.balance === '' || isNaN(Number(form.balance)) || Number(form.balance) < 0)
      e.balance = 'Enter a valid balance (0 or more)';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = { ...form, balance: Number(form.balance) };
      if (isEditing) {
        await accountAPI.update(account.id, payload);
      } else {
        await accountAPI.create(payload);
      }
      onSuccess();
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Account' : 'Add Account'}
        </h2>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      {serverError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Account Name</label>
            <input
              id="name" name="name" type="text" className="input-field"
              placeholder="e.g. HDFC Savings"
              value={form.name} onChange={handleChange}
            />
            {errors.name && <p className="error-text">{errors.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="type">Account Type</label>
            <select id="type" name="type" className="input-field"
              value={form.type} onChange={handleChange}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_META[t].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="balance">
              {form.type === 'CREDIT_CARD' ? 'Outstanding Balance (₹)' : 'Current Balance (₹)'}
            </label>
            {form.type === 'CREDIT_CARD' && (
              <p className="text-xs text-gray-400 mb-1">
                Enter the amount you owe — this will be subtracted from your net worth.
              </p>
            )}
            <input
              id="balance" name="balance" type="number"
              min="0" step="0.01" className="input-field" placeholder="0.00"
              value={form.balance} onChange={handleChange}
            />
            {errors.balance && <p className="error-text">{errors.balance}</p>}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : isEditing ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ─── Page ─── */
const Accounts = () => {
  const { user } = useAuth();
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [accounts,        setAccounts]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editingAccount,  setEditingAccount]  = useState(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await accountAPI.getAll();
      setAccounts(Array.isArray(res.data) ? res.data : res.data.accounts ?? res.data.data ?? []);
    } catch {
      setError('Failed to load accounts. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleCloseModal = () => { setModalOpen(false); setEditingAccount(null); };
  const handleFormSuccess = () => { handleCloseModal(); fetchAccounts(); };
  const handleEdit = (acc) => { setEditingAccount(acc); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account? This cannot be undone.')) return;
    setError('');
    try {
      await accountAPI.delete(id);
      fetchAccounts();
    } catch {
      setError('Failed to delete account.');
    }
  };

  /* Summary computations */
  const totalAssets = accounts
    .filter((a) => a.type !== 'CREDIT_CARD')
    .reduce((s, a) => s + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.type === 'CREDIT_CARD')
    .reduce((s, a) => s + a.balance, 0);

  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Accounts & Wallets</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {accounts.length} account{accounts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => { setEditingAccount(null); setModalOpen(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Account</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Net-worth summary strip */}
          {!loading && accounts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary-50">
                  <Landmark className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net Worth</p>
                  <p className={`text-lg font-bold ${netWorth >= 0 ? 'text-primary-600' : 'text-red-500'}`}>
                    ₹{fmt(netWorth)}
                  </p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-50">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Assets</p>
                  <p className="text-lg font-bold text-emerald-600">₹{fmt(totalAssets)}</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-50">
                  <CreditCard className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Liabilities</p>
                  <p className="text-lg font-bold text-red-500">₹{fmt(totalLiabilities)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Account grid */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="card py-16 text-center">
              <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-4">
                No accounts yet. Add your first account to start tracking balances.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const meta = TYPE_META[acc.type] ?? TYPE_META.BANK;
                const { Icon } = meta;
                const isCreditCard = acc.type === 'CREDIT_CARD';
                return (
                  <div key={acc.id} className="card flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${meta.bg}`}>
                          <Icon className={`w-5 h-5 ${meta.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 truncate max-w-[140px]">
                            {acc.name}
                          </p>
                          <p className="text-xs text-gray-400">{meta.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(acc)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">
                        {isCreditCard ? 'Outstanding Balance' : 'Current Balance'}
                      </p>
                      <p className={`text-2xl font-bold ${isCreditCard ? 'text-red-500' : 'text-gray-900'}`}>
                        {isCreditCard ? '-' : ''}₹{fmt(acc.balance)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal}>
        <AccountForm
          account={editingAccount}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default Accounts;