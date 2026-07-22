import React, { useState, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import { useAuth } from '../hooks/useAuth';
import { useTransactions } from '../hooks/useTransactions';
import { transactionAPI } from '../services/api';
import {
  Plus, Search, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  SlidersHorizontal, Download, Upload, Loader2, CheckCircle, AlertTriangle,
} from 'lucide-react';

const PAGE_SIZE = 10;

const ALL_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other Income',
  'Food', 'Transport', 'Shopping', 'Entertainment', 'Health',
  'Education', 'Utilities', 'Rent', 'Other Expense',
];

const formatDate   = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatAmount = (v) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── CSV Export ────────────────────────────────────────────────────────────────
const exportToCSV = (transactions) => {
  const header = ['Date', 'Type', 'Category', 'Amount', 'Description'];
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    t.category,
    t.amount,
    t.description ? `"${t.description.replace(/"/g, '""')}"` : '',
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── CSV Import parser ─────────────────────────────────────────────────────────
// Expected columns (case-insensitive): date, type, category, amount, description
const VALID_TYPES      = new Set(['INCOME', 'EXPENSE']);
const VALID_CATEGORIES = new Set(ALL_CATEGORIES);

const parseCSV = (text) => {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  // parse header
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const idx = {
    date:        headers.indexOf('date'),
    type:        headers.indexOf('type'),
    category:    headers.indexOf('category'),
    amount:      headers.indexOf('amount'),
    description: headers.indexOf('description'),
  };

  if (idx.date < 0 || idx.type < 0 || idx.category < 0 || idx.amount < 0) {
    throw new Error('Missing required columns. CSV must have: Date, Type, Category, Amount');
  }

  const valid   = [];
  const invalid = [];

  lines.slice(1).forEach((line, i) => {
    // handle quoted fields
    const cols = [];
    let cur = '', inQuote = false;
    for (const ch of line + ',') {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }

    const row = {
      date:        cols[idx.date]        || '',
      type:        (cols[idx.type]       || '').toUpperCase().trim(),
      category:    cols[idx.category]    || '',
      amount:      cols[idx.amount]      || '',
      description: idx.description >= 0 ? (cols[idx.description] || '') : '',
    };

    const errors = [];
    if (!row.date || isNaN(Date.parse(row.date)))         errors.push('invalid date');
    if (!VALID_TYPES.has(row.type))                       errors.push(`type must be INCOME or EXPENSE`);
    if (!VALID_CATEGORIES.has(row.category))              errors.push(`unknown category "${row.category}"`);
    if (isNaN(Number(row.amount)) || Number(row.amount) <= 0) errors.push('amount must be a positive number');

    if (errors.length) {
      invalid.push({ row: i + 2, errors });
    } else {
      valid.push({
        date:        row.date,
        type:        row.type,
        category:    row.category,
        amount:      Number(row.amount),
        description: row.description || null,
      });
    }
  });

  return { valid, invalid };
};

// ── Import modal ──────────────────────────────────────────────────────────────
const ImportModal = ({ onClose, onSuccess }) => {
  const fileRef     = useRef();
  const [state, setState] = useState('idle'); // idle | preview | importing | done | error
  const [parsed, setParsed]   = useState({ valid: [], invalid: [] });
  const [imported, setImported] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = parseCSV(ev.target.result);
        setParsed(result);
        setState('preview');
        setErrorMsg('');
      } catch (err) {
        setErrorMsg(err.message);
        setState('error');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setState('importing');
    let count = 0;
    const failures = [];
    for (const tx of parsed.valid) {
      try {
        await transactionAPI.create(tx);
        count++;
      } catch {
        failures.push(tx);
      }
    }
    setImported(count);
    setState('done');
    if (count > 0) onSuccess();
  };

  const downloadTemplate = () => {
    const csv = 'Date,Type,Category,Amount,Description\n2024-01-15,EXPENSE,Food,450,Grocery run\n2024-01-16,INCOME,Salary,85000,Monthly salary';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Import from CSV</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* idle */}
      {state === 'idle' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 space-y-1">
            <p className="font-medium">CSV Format Required</p>
            <p>Columns: <code className="bg-blue-100 px-1 rounded">Date, Type, Category, Amount, Description</code></p>
            <p>Type must be <code className="bg-blue-100 px-1 rounded">INCOME</code> or <code className="bg-blue-100 px-1 rounded">EXPENSE</code></p>
            <p>Date format: <code className="bg-blue-100 px-1 rounded">YYYY-MM-DD</code></p>
          </div>

          <button onClick={downloadTemplate} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Download Template CSV
          </button>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Click to upload CSV file</p>
            <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      )}

      {/* error */}
      {state === 'error' && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <p className="font-medium mb-1">Failed to parse CSV</p>
            <p>{errorMsg}</p>
          </div>
          <button onClick={() => { setState('idle'); setFileName(''); }} className="btn-secondary w-full">Try Again</button>
        </div>
      )}

      {/* preview */}
      {state === 'preview' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 font-medium">{fileName}</p>

          <div className="flex gap-3">
            <div className="flex-1 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-700">{parsed.valid.length}</p>
              <p className="text-xs text-emerald-600">Valid rows</p>
            </div>
            <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-700">{parsed.invalid.length}</p>
              <p className="text-xs text-red-600">Invalid rows</p>
            </div>
          </div>

          {parsed.invalid.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1 max-h-36 overflow-y-auto">
              <p className="font-medium">Rows with errors (will be skipped):</p>
              {parsed.invalid.map((r) => (
                <p key={r.row}>Row {r.row}: {r.errors.join(', ')}</p>
              ))}
            </div>
          )}

          {parsed.valid.length === 0 ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              No valid rows to import.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg text-xs">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {['Date','Type','Category','Amount','Description'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parsed.valid.slice(0, 20).map((tx, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{tx.date}</td>
                      <td className={`px-3 py-2 font-medium ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>{tx.type}</td>
                      <td className="px-3 py-2">{tx.category}</td>
                      <td className="px-3 py-2">₹{tx.amount}</td>
                      <td className="px-3 py-2 text-gray-400 truncate max-w-[100px]">{tx.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.valid.length > 20 && (
                <p className="text-center text-gray-400 py-2">…and {parsed.valid.length - 20} more</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setState('idle'); setParsed({ valid: [], invalid: [] }); setFileName(''); }} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleImport} disabled={parsed.valid.length === 0} className="btn-primary flex-1">
              Import {parsed.valid.length} Transactions
            </button>
          </div>
        </div>
      )}

      {/* importing */}
      {state === 'importing' && (
        <div className="py-10 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          <p className="text-sm text-gray-600">Importing transactions…</p>
        </div>
      )}

      {/* done */}
      {state === 'done' && (
        <div className="py-8 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <div>
            <p className="text-lg font-bold text-gray-900">{imported} transactions imported!</p>
            <p className="text-sm text-gray-500 mt-1">Your transactions list has been updated.</p>
          </div>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const Transactions = () => {
  const { user } = useAuth();
  const [sidebarOpen,        setSidebarOpen]        = useState(false);
  const [modalOpen,          setModalOpen]          = useState(false);
  const [importOpen,         setImportOpen]         = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteError,        setDeleteError]        = useState('');
  const [currentPage,        setCurrentPage]        = useState(1);
  const [filtersVisible,     setFiltersVisible]     = useState(false);

  const {
    transactions, loading, error,
    filters, updateFilter, clearFilters, hasActiveFilters, refetch,
  } = useTransactions();

  // ── amount range client-side filter ──────────────────────────────────────
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const displayedTransactions = transactions.filter((t) => {
    if (minAmount !== '' && t.amount < Number(minAmount)) return false;
    if (maxAmount !== '' && t.amount > Number(maxAmount)) return false;
    return true;
  });

  const totalPages = Math.ceil(displayedTransactions.length / PAGE_SIZE);
  const paginated  = displayedTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleFilterChange = useCallback((e) => {
    updateFilter(e.target.name, e.target.value);
    setCurrentPage(1);
  }, [updateFilter]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);
  }, [clearFilters]);

  const hasAmountFilter = minAmount !== '' || maxAmount !== '';
  const anyFilter = hasActiveFilters || hasAmountFilter;

  const handleOpenAdd  = () => { setEditingTransaction(null); setModalOpen(true); };
  const handleOpenEdit = (tx) => { setEditingTransaction(tx); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setEditingTransaction(null); };
  const handleFormSuccess = () => { handleCloseModal(); refetch(); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    setDeleteError('');
    try {
      await transactionAPI.delete(id);
      if (paginated.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      refetch();
    } catch {
      setDeleteError('Failed to delete. Please try again.');
    }
  };

  const filteredIncome  = displayedTransactions.filter((t) => t.type === 'INCOME' ).reduce((s, t) => s + t.amount, 0);
  const filteredExpense = displayedTransactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3)              return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    return Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);
  })();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {displayedTransactions.length}{' '}
                {anyFilter ? 'matching' : 'total'}{' '}
                transaction{displayedTransactions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setImportOpen(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Import CSV"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => exportToCSV(displayedTransactions)}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Transaction</span>
              </button>
            </div>
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">₹{formatAmount(filteredIncome)} income</span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <ArrowDownCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-600 font-medium">₹{formatAmount(filteredExpense)} expenses</span>
            </div>
          </div>

          {/* Search + filters */}
          <div className="card mb-4">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="search" type="text" className="input-field pl-9"
                  placeholder="Search description or category..."
                  value={filters.search} onChange={handleFilterChange}
                />
              </div>
              <button
                onClick={() => setFiltersVisible((v) => !v)}
                className={`btn-secondary flex items-center gap-2 ${filtersVisible ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {anyFilter && !filtersVisible && <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />}
              </button>
              {anyFilter && (
                <button onClick={handleClearFilters} className="btn-secondary flex items-center gap-1 text-sm text-gray-500 hover:text-red-500" title="Clear all filters">
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>

            {filtersVisible && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-gray-100">
                {/* Type */}
                <select name="type" className="input-field text-sm" value={filters.type} onChange={handleFilterChange}>
                  <option value="">All Types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>

                {/* Category */}
                <select name="category" className="input-field text-sm" value={filters.category} onChange={handleFilterChange}>
                  <option value="">All Categories</option>
                  {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Start date */}
                <input name="startDate" type="date" className="input-field text-sm" value={filters.startDate} onChange={handleFilterChange} />

                {/* End date */}
                <input name="endDate" type="date" className="input-field text-sm" value={filters.endDate} onChange={handleFilterChange} />

                {/* Amount range */}
                <div className="flex gap-1 col-span-2 md:col-span-1">
                  <input
                    type="number" min="0" placeholder="Min ₹"
                    className="input-field text-sm"
                    value={minAmount}
                    onChange={(e) => { setMinAmount(e.target.value); setCurrentPage(1); }}
                  />
                  <input
                    type="number" min="0" placeholder="Max ₹"
                    className="input-field text-sm"
                    value={maxAmount}
                    onChange={(e) => { setMaxAmount(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
          {deleteError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{deleteError}</div>}

          {/* Table */}
          {loading ? (
            <div className="card flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              <span className="ml-2 text-gray-500 text-sm">Loading…</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="card py-16 text-center text-gray-400 text-sm">
              {anyFilter ? 'No transactions match your filters.' : 'No transactions yet. Add your first one!'}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="card p-0 overflow-hidden hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-6 py-3 font-medium">Date</th>
                      <th className="text-left px-6 py-3 font-medium">Category</th>
                      <th className="text-left px-6 py-3 font-medium">Description</th>
                      <th className="text-left px-6 py-3 font-medium">Type</th>
                      <th className="text-right px-6 py-3 font-medium">Amount</th>
                      <th className="text-center px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(tx.date)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{tx.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{tx.description || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={tx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}>{tx.type}</span>
                        </td>
                        <td className={`px-6 py-4 text-right text-sm font-semibold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}₹{formatAmount(tx.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleOpenEdit(tx)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden card p-0 overflow-hidden divide-y divide-gray-100">
                {paginated.map((tx) => (
                  <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      <span className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.category}</p>
                      <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}₹{formatAmount(tx.amount)}
                      </p>
                      <div className="flex gap-2 mt-1 justify-end">
                        <button onClick={() => handleOpenEdit(tx)} className="text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(tx.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-4">
                  <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {pageNumbers.map((n) => (
                    <button key={n} onClick={() => setCurrentPage(n)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${n === currentPage ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal}>
        <TransactionForm transaction={editingTransaction} onSuccess={handleFormSuccess} onCancel={handleCloseModal} />
      </Modal>

      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)}>
        <ImportModal onClose={() => setImportOpen(false)} onSuccess={() => { setImportOpen(false); refetch(); }} />
      </Modal>
    </div>
  );
};

export default Transactions;
