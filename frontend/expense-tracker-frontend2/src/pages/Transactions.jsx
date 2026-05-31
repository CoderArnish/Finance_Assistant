import React, { useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import { useAuth } from '../hooks/useAuth';
import { useTransactions } from '../hooks/useTransactions';
import { transactionAPI } from '../services/api';
import {
  Plus, Search, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal,
} from 'lucide-react';

const PAGE_SIZE = 10;

const ALL_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other Income',
  'Food', 'Transport', 'Shopping', 'Entertainment', 'Health',
  'Education', 'Utilities', 'Rent', 'Other Expense',
];

const formatDate   = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatAmount = (v) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Transactions = () => {
  const { user } = useAuth();
  const [sidebarOpen,        setSidebarOpen]        = useState(false);
  const [modalOpen,          setModalOpen]          = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteError,        setDeleteError]        = useState('');
  const [currentPage,        setCurrentPage]        = useState(1);
  const [filtersVisible,     setFiltersVisible]     = useState(false);

  const {
    transactions, loading, error,
    filters, updateFilter, clearFilters, hasActiveFilters, refetch,
  } = useTransactions();

  // Pagination
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  const paginated  = transactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleFilterChange = useCallback((e) => {
    updateFilter(e.target.name, e.target.value);
    setCurrentPage(1);
  }, [updateFilter]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setCurrentPage(1);
  }, [clearFilters]);

  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setEditingTransaction(tx);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTransaction(null);
  };

  const handleFormSuccess = () => {
    handleCloseModal();
    refetch();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    setDeleteError('');
    try {
      await transactionAPI.delete(id);
      // If deleting the last item on a page > 1, step back
      if (paginated.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
      refetch();
    } catch {
      setDeleteError('Failed to delete. Please try again.');
    }
  };

  // Running totals for the current filtered set (all pages)
  const filteredIncome  = transactions.filter((t) => t.type === 'INCOME' ).reduce((s, t) => s + t.amount, 0);
  const filteredExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  // Compact page-number list (max 5 buttons, centered around current page)
  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3)               return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2)  return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    return Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);
  })();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {transactions.length}{' '}
                {hasActiveFilters ? 'matching' : 'total'}{' '}
                transaction{transactions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Transaction</span>
            </button>
          </div>

          {/* Filtered summary pills */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">
                ₹{formatAmount(filteredIncome)} income
              </span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <ArrowDownCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-600 font-medium">
                ₹{formatAmount(filteredExpense)} expenses
              </span>
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="card mb-4">
            <div className="flex gap-2 mb-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="search" type="text" className="input-field pl-9"
                  placeholder="Search description or category..."
                  value={filters.search} onChange={handleFilterChange}
                />
              </div>

              {/* Filters toggle */}
              <button
                onClick={() => setFiltersVisible((v) => !v)}
                className={`btn-secondary flex items-center gap-2 ${
                  filtersVisible ? 'bg-primary-50 border-primary-300 text-primary-700' : ''
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && !filtersVisible && (
                  <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" aria-label="Active filters" />
                )}
              </button>

              {/* Clear all */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="btn-secondary flex items-center gap-1 text-sm text-gray-500 hover:text-red-500"
                  title="Clear all filters"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>

            {/* Collapsible advanced filters */}
            {filtersVisible && (
              <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                <div>
                  <label className="label">Type</label>
                  <select name="type" className="input-field w-36" value={filters.type} onChange={handleFilterChange}>
                    <option value="">All types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="label">Category</label>
                  <select name="category" className="input-field w-44" value={filters.category} onChange={handleFilterChange}>
                    <option value="">All categories</option>
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">From</label>
                  <input
                    name="startDate" type="date" className="input-field w-36"
                    value={filters.startDate} onChange={handleFilterChange}
                    max={filters.endDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="label">To</label>
                  <input
                    name="endDate" type="date" className="input-field w-36"
                    value={filters.endDate} onChange={handleFilterChange}
                    min={filters.startDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error banners */}
          {(error || deleteError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error || deleteError}
            </div>
          )}

          {/* Table card */}
          <div className="card overflow-hidden p-0">
            {loading ? (
              <div className="p-12 text-center text-gray-400 text-sm">Loading transactions...</div>
            ) : paginated.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 text-sm">
                  {hasActiveFilters
                    ? 'No transactions match your filters.'
                    : 'No transactions yet. Add your first one!'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-3 text-primary-600 text-sm hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Date</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Category</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Description</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Type</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Amount</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginated.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                            {formatDate(tx.date)}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-gray-800">
                            {tx.category}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">
                            {tx.description || '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={tx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}>
                              {tx.type === 'INCOME' ? 'Income' : 'Expense'}
                            </span>
                          </td>
                          <td className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap ${
                            tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {tx.type === 'INCOME' ? '+' : '-'}₹{formatAmount(tx.amount)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(tx)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
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
                <div className="md:hidden divide-y divide-gray-100">
                  {paginated.map((tx) => (
                    <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'INCOME' ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        <span className={`text-sm font-bold ${
                          tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {tx.type === 'INCOME' ? '+' : '-'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{tx.category}</p>
                        <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                        {tx.description && (
                          <p className="text-xs text-gray-400 truncate">{tx.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${
                          tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {tx.type === 'INCOME' ? '+' : '-'}₹{formatAmount(tx.amount)}
                        </p>
                        <div className="flex gap-2 mt-1 justify-end">
                          <button onClick={() => handleOpenEdit(tx)} className="text-gray-400 hover:text-blue-500">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tx.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, transactions.length)} of {transactions.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {pageNumbers.map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium ${
                            currentPage === page
                              ? 'bg-primary-600 text-white'
                              : 'hover:bg-gray-100 text-gray-500'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Add / Edit modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal}>
        <TransactionForm
          transaction={editingTransaction}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default Transactions;