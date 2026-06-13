import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { budgetAPI } from '../services/api';
import {
  Plus, Pencil, Trash2, X, Loader2, AlertTriangle, Target,
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Entertainment', 'Health',
  'Education', 'Utilities', 'Rent', 'Other Expense',
];

const EMPTY_FORM = { name: '', category: '', limitAmount: '', period: 'MONTHLY' };

const fmt = (v) =>
  Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Returns Tailwind colour tokens based on how much of the budget is used. */
const statusColors = (pct) => {
  if (pct >= 100) return { bar: 'bg-red-500',    text: 'text-red-600',    badge: 'bg-red-50 text-red-600 border-red-200'    };
  if (pct >= 80)  return { bar: 'bg-amber-400',  text: 'text-amber-600',  badge: 'bg-amber-50 text-amber-600 border-amber-200'  };
  return           { bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
};

/* ─── Inline form (rendered inside Modal) ─── */
const BudgetForm = ({ budget, onSuccess, onCancel }) => {
  const isEditing = Boolean(budget);

  const [form, setForm] = useState(
    isEditing
      ? { name: budget.name, category: budget.category, limitAmount: String(budget.limitAmount), period: budget.period }
      : EMPTY_FORM
  );
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())
      e.name = 'Name is required';
    if (!form.category)
      e.category = 'Category is required';
    if (!form.limitAmount || isNaN(Number(form.limitAmount)) || Number(form.limitAmount) <= 0)
      e.limitAmount = 'Enter a valid positive amount';
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
      const payload = { ...form, limitAmount: Number(form.limitAmount) };
      if (isEditing) {
        await budgetAPI.update(budget.id, payload);
      } else {
        await budgetAPI.create(payload);
      }
      onSuccess();
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save budget.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Budget' : 'New Budget'}
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
          {/* Name */}
          <div>
            <label className="label" htmlFor="name">Budget Name</label>
            <input
              id="name" name="name" type="text" className="input-field"
              placeholder="e.g. Monthly Groceries"
              value={form.name} onChange={handleChange}
            />
            {errors.name && <p className="error-text">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="input-field"
              value={form.category} onChange={handleChange}>
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <p className="error-text">{errors.category}</p>}
          </div>

          {/* Limit */}
          <div>
            <label className="label" htmlFor="limitAmount">Spending Limit (₹)</label>
            <input
              id="limitAmount" name="limitAmount" type="number"
              min="1" step="1" className="input-field" placeholder="5000"
              value={form.limitAmount} onChange={handleChange}
            />
            {errors.limitAmount && <p className="error-text">{errors.limitAmount}</p>}
          </div>

          {/* Period toggle */}
          <div>
            <label className="label">Period</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {['MONTHLY', 'WEEKLY'].map((p) => (
                <button
                  key={p} type="button"
                  onClick={() => setForm((prev) => ({ ...prev, period: p }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors
                    ${form.period === p
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ─── Page ─── */
const Budgets = () => {
  const { user } = useAuth();
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [budgets,        setBudgets]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editingBudget,  setEditingBudget]  = useState(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await budgetAPI.getAll();
      setBudgets(Array.isArray(res.data) ? res.data : res.data.budgets ?? res.data.data ?? []);
    } catch {
      setError('Failed to load budgets. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const handleCloseModal = () => { setModalOpen(false); setEditingBudget(null); };
  const handleFormSuccess = () => { handleCloseModal(); fetchBudgets(); };
  const handleEdit = (b) => { setEditingBudget(b); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    setError('');
    try {
      await budgetAPI.delete(id);
      fetchBudgets();
    } catch {
      setError('Failed to delete budget.');
    }
  };

  /* Summary totals across all budgets */
  const totalBudgeted = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent    = budgets.reduce((s, b) => s + (b.spent    ?? 0), 0);
  const overCount     = budgets.filter((b) => (b.percentage ?? 0) >= 100).length;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Budgets</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Track spending against your monthly and weekly limits
              </p>
            </div>
            <button
              onClick={() => { setEditingBudget(null); setModalOpen(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Budget</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Summary strip */}
          {!loading && budgets.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="card py-3 px-4">
                <p className="text-xs text-gray-500">Total Budgeted</p>
                <p className="font-bold text-gray-900 text-lg">₹{fmt(totalBudgeted)}</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-gray-500">Spent This Period</p>
                <p className={`font-bold text-lg ${totalSpent > totalBudgeted ? 'text-red-600' : 'text-gray-900'}`}>
                  ₹{fmt(totalSpent)}
                </p>
              </div>
              {overCount > 0 && (
                <div className="card py-3 px-4 flex items-center gap-2 bg-red-50 border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-red-500">Over Budget</p>
                    <p className="font-bold text-red-600">{overCount} budget{overCount > 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Budget cards */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading budgets...</div>
          ) : budgets.length === 0 ? (
            <div className="card py-16 text-center">
              <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-4">
                No budgets yet. Create one to start tracking your spending.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create your first budget
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {budgets.map((budget) => {
                const pct    = budget.percentage ?? 0;
                const colors = statusColors(pct);
                const displayPct = Math.min(pct, 100);

                return (
                  <div key={budget.id} className="card flex flex-col gap-0">
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{budget.name}</h3>
                        <span className="text-xs text-gray-400">
                          {budget.category} · {budget.period.charAt(0) + budget.period.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(budget.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-semibold ${colors.text}`}>
                        ₹{fmt(budget.spent ?? 0)} spent
                      </span>
                      <span className="text-gray-500">
                        of ₹{fmt(budget.limitAmount)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${displayPct}%` }}
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        {pct >= 100
                          ? `Over by ₹${fmt(Math.abs(budget.remaining ?? 0))}`
                          : `₹${fmt(budget.remaining ?? 0)} remaining`}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal}>
        <BudgetForm
          budget={editingBudget}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default Budgets;