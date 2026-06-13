import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import { transactionAPI, accountAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet,
  Plus, ArrowRight, Landmark, PiggyBank,
} from 'lucide-react';

const COLORS = ['#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const toArray = (val) => (Array.isArray(val) ? val : val?.accounts ?? val?.data ?? []);

const formatDate   = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatAmount = (v) => Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const Dashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts,     setAccounts]     = useState([]);
  const [summary,      setSummary]      = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // ── CHANGED: removed accountAPI.getNetWorth() — computed client-side below ──
      const [txRes, summaryRes, accountRes] = await Promise.all([
        transactionAPI.getAll({}),
        transactionAPI.getSummary(),
        accountAPI.getAll(),
      ]);
      setTransactions(txRes.data);
      setSummary(summaryRes.data);
      setAccounts(toArray(accountRes.data));
    } catch {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFormSuccess = () => { setModalOpen(false); fetchData(); };

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const monthlyData = transactions
    .reduce((acc, t) => {
      const month = new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      const existing = acc.find((a) => a.month === month);
      if (existing) {
        if (t.type === 'INCOME') existing.income  += t.amount;
        else                     existing.expense += t.amount;
      } else {
        acc.push({
          month,
          income:  t.type === 'INCOME'  ? t.amount : 0,
          expense: t.type === 'EXPENSE' ? t.amount : 0,
        });
      }
      return acc;
    }, [])
    .slice(-6);

  const categoryData = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => {
      const existing = acc.find((a) => a.name === t.category);
      if (existing) existing.value += t.amount;
      else acc.push({ name: t.category, value: t.amount });
      return acc;
    }, []);

  const accountDistribution = accounts
    .filter((a) => a.balance > 0)
    .map((a) => ({ name: a.name, value: a.balance }));

  // ── CHANGED: Net Worth correctly subtracts credit card balances ──
  const netWorth = accounts.reduce(
    (sum, a) => sum + (a.type === 'CREDIT_CARD' ? -a.balance : a.balance),
    0
  );

  const savingsRate =
    summary.totalIncome > 0
      ? (((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100).toFixed(1)
      : 0;

  // ── CHANGED: removed duplicate "Total Assets" card — it was identical to Net Worth ──
  const summaryCards = [
    {
      label: 'Net Worth',
      value: netWorth,
      icon:  PiggyBank,
      color: netWorth >= 0 ? 'text-violet-600' : 'text-red-500',
      bg:    'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Total Income',
      value: summary.totalIncome,
      icon:  TrendingUp,
      color: 'text-emerald-600',
      bg:    'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Total Expenses',
      value: summary.totalExpense,
      icon:  TrendingDown,
      color: 'text-red-500',
      bg:    'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      label: 'Savings Rate',
      value: savingsRate,
      icon:  Wallet,
      color: 'text-primary-600',
      bg:    'bg-primary-50',
      iconColor: 'text-primary-600',
      suffix: '%',
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Welcome back, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Here's your financial overview</p>
            </div>
            <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Transaction</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* KPI cards — 4 cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((card) => (
              <div key={card.label} className="card flex items-center gap-3 md:gap-4">
                <div className={`p-2.5 md:p-3 rounded-xl ${card.bg} flex-shrink-0`}>
                  <card.icon className={`w-5 h-5 md:w-6 md:h-6 ${card.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-gray-500 truncate">{card.label}</p>
                  <p className={`text-base md:text-xl font-bold ${card.color}`}>
                    {card.suffix
                      ? `${card.value}${card.suffix}`
                      : `₹${formatAmount(card.value)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          {!loading && transactions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="card">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Monthly Overview</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                    <Legend />
                    <Bar dataKey="income"  fill="#10b981" name="Income"  radius={[4,4,0,0]} />
                    <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Expense by Category</h2>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryData} cx="50%" cy="50%"
                        innerRadius={55} outerRadius={90} paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    No expense data yet
                  </div>
                )}
              </div>

              <div className="card">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Asset Distribution</h2>
                {accountDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={accountDistribution} cx="50%" cy="50%"
                        outerRadius={90} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {accountDistribution.map((entry, i) => (
                          <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    No account data
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accounts snapshot */}
          {accounts.length > 0 && (
            <div className="card mb-6 p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Accounts & Wallets</h2>
                <Link to="/accounts" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                {accounts.slice(0, 4).map((acc) => (
                  <div key={acc.id} className="px-5 py-4 flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{acc.name}</p>
                      <p className="text-xs text-gray-400">{acc.type.replace('_', ' ')}</p>
                    </div>
                    <p className={`text-sm font-bold ml-auto flex-shrink-0 ${acc.type === 'CREDIT_CARD' ? 'text-red-500' : 'text-gray-900'}`}>
                      {acc.type === 'CREDIT_CARD' ? '-' : ''}₹{formatAmount(acc.balance)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Recent Transactions</h2>
              <Link to="/transactions" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No transactions yet.{' '}
                <button onClick={() => setModalOpen(true)} className="text-primary-600 hover:underline">
                  Add your first one
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'INCOME' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      <span className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{tx.category}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(tx.date)}{tx.description && ` · ${tx.description}`}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}₹{formatAmount(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <TransactionForm
          transaction={null}
          onSuccess={handleFormSuccess}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;