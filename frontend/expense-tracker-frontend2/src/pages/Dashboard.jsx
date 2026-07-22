import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import { useAuth } from '../hooks/useAuth';
import { transactionAPI, accountAPI } from '../services/api';
import {
  TrendingUp, TrendingDown, Wallet, Plus, ArrowRight, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt    = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtAmt  = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

// ── date range helpers ────────────────────────────────────────────────────────
const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};
const startOfWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
};
const startOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const PERIODS = [
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week'  },
  { label: 'This Month', value: 'month' },
  { label: 'All Time',   value: 'all'   },
];

const getDateRange = (period) => {
  switch (period) {
    case 'today': return { startDate: today(),        endDate: today()  };
    case 'week':  return { startDate: startOfWeek(),  endDate: today()  };
    case 'month': return { startDate: startOfMonth(), endDate: today()  };
    default:      return {};
  }
};

// ── KPI card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
      <p className="text-xl font-bold text-gray-900 truncate">₹{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [period,      setPeriod]      = useState('month');

  const [transactions, setTransactions] = useState([]);
  const [netWorth,     setNetWorth]     = useState(0);
  const [loading,      setLoading]      = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange(period);
      const [txRes, nwRes] = await Promise.all([
        transactionAPI.getAll(dateRange),
        accountAPI.getAll(),
      ]);

      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);

      // compute net worth from accounts
      const accounts = Array.isArray(nwRes.data) ? nwRes.data : [];
      const nw = accounts.reduce((sum, a) => {
        return a.type === 'CREDIT_CARD' ? sum - a.balance : sum + a.balance;
      }, 0);
      setNetWorth(nw);
    } catch {
      // silent fail — UI shows zeros
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFormSuccess = () => { setModalOpen(false); fetchData(); };

  // ── derived data ──────────────────────────────────────────────────────────
  const totalIncome  = transactions.filter((t) => t.type === 'INCOME' ).reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  // category pie — expenses only
  const categoryMap = {};
  transactions.filter((t) => t.type === 'EXPENSE').forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });
  const pieData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // monthly bar — last 6 months
  const barMap = {};
  transactions.forEach((t) => {
    const month = t.date?.slice(0, 7); // YYYY-MM
    if (!month) return;
    if (!barMap[month]) barMap[month] = { month, income: 0, expense: 0 };
    if (t.type === 'INCOME')  barMap[month].income  += t.amount;
    if (t.type === 'EXPENSE') barMap[month].expense += t.amount;
  });
  const barData = Object.values(barMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((d) => ({ ...d, month: new Date(d.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }));

  const recentTransactions = [...transactions].slice(0, 8);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome back, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Here's your financial summary</p>
            </div>
            <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Transaction</span>
            </button>
          </div>

          {/* Period filter tabs */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  period === p.value
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard title="Total Income"   value={fmt(totalIncome)}  icon={TrendingUp}   color="bg-emerald-500" />
                <KpiCard title="Total Expenses" value={fmt(totalExpense)} icon={TrendingDown}  color="bg-red-500"     />
                <KpiCard
                  title="Balance"
                  value={fmt(Math.abs(balance))}
                  icon={Wallet}
                  color={balance >= 0 ? 'bg-primary-600' : 'bg-amber-500'}
                  sub={balance < 0 ? 'Overspent' : undefined}
                />
                <KpiCard title="Net Worth" value={fmt(Math.abs(netWorth))} icon={Wallet} color="bg-purple-500" sub={netWorth < 0 ? 'Negative' : undefined} />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Monthly bar chart */}
                {barData.length > 0 && (
                  <div className="card">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">Monthly Overview</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={barData} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => `₹${fmt(v)}`} />
                        <Bar dataKey="income"  fill="#10b981" name="Income"  radius={[3,3,0,0]} />
                        <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Category pie */}
                {pieData.length > 0 && (
                  <div className="card">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">Spending by Category</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                          dataKey="value" nameKey="name" paddingAngle={2}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `₹${fmt(v)}`} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Recent transactions */}
              <div className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Recent Transactions</h2>
                  <Link to="/transactions" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentTransactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No transactions in this period.{' '}
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
                            {fmtDate(tx.date)}{tx.description && ` · ${tx.description}`}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}₹{fmtAmt(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <TransactionForm transaction={null} onSuccess={handleFormSuccess} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Dashboard;
