import React from 'react';
import { Pencil, Trash2, Loader2, Receipt } from 'lucide-react';

const TransactionList = ({ transactions, loading, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-500 text-sm">Loading transactions...</span>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <Receipt className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-base font-medium text-gray-700 mb-1">No transactions found</h3>
        <p className="text-gray-400 text-sm">Add your first transaction to get started</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800">
          Transactions
          <span className="ml-2 text-sm font-normal text-gray-400">({transactions.length})</span>
        </h2>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
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
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(tx.date)}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-800">{tx.category}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {tx.description || '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={tx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}>
                    {tx.type}
                  </span>
                </td>
                <td className={`px-6 py-4 text-right text-sm font-semibold ${
                  tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {tx.type === 'INCOME' ? '+' : '-'}₹{formatAmount(tx.amount)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(tx.id)}
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

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {transactions.map((tx) => (
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
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${
                tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {tx.type === 'INCOME' ? '+' : '-'}₹{formatAmount(tx.amount)}
              </p>
              <div className="flex gap-2 mt-1 justify-end">
                <button onClick={() => onEdit(tx)} className="text-gray-400 hover:text-blue-600">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(tx.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;