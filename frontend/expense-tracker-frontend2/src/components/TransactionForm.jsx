import React, { useState, useEffect } from 'react';
import { transactionAPI } from '../services/api';
import { X, Loader2 } from 'lucide-react';

const CATEGORIES = {
  INCOME: ['Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other Income'],
  EXPENSE: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Utilities', 'Rent', 'Other Expense'],
};

const TransactionForm = ({ transaction, onSuccess, onCancel }) => {
  const isEditing = Boolean(transaction);

  const [formData, setFormData] = useState({
    amount: '',
    type: 'EXPENSE',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: String(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        description: transaction.description || '',
      });
    }
  }, [transaction]);

  const validate = () => {
    const newErrors = {};
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Enter a valid positive amount';
    }
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.date) newErrors.date = 'Date is required';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Reset category when type changes
      if (name === 'type') updated.category = '';
      return updated;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError('');

    const payload = {
      amount: Number(formData.amount),
      type: formData.type,
      category: formData.category,
      date: formData.date,
      description: formData.description || null,
    };

    try {
      if (isEditing) {
        await transactionAPI.update(transaction.id, payload);
      } else {
        await transactionAPI.create(payload);
      }
      onSuccess();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save transaction.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = CATEGORIES[formData.type] || [];

  return (
    <div className="card relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Transaction' : 'Add Transaction'}
        </h2>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
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
          {/* Type Toggle */}
          <div>
            <label className="label">Type</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {['INCOME', 'EXPENSE'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleChange({ target: { name: 'type', value: t } })}
                  className={`flex-1 py-2 text-sm font-medium transition-colors
                    ${formData.type === t
                      ? t === 'INCOME'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {errors.type && <p className="error-text">{errors.type}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="label" htmlFor="amount">Amount (₹)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              className="input-field"
              placeholder="0.00"
              value={formData.amount}
              onChange={handleChange}
            />
            {errors.amount && <p className="error-text">{errors.amount}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              className="input-field"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Select category</option>
              {currentCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="error-text">{errors.category}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              className="input-field"
              value={formData.date}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.date && <p className="error-text">{errors.date}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label" htmlFor="description">Description (optional)</label>
            <input
              id="description"
              name="description"
              type="text"
              className="input-field"
              placeholder="Short note..."
              value={formData.description}
              onChange={handleChange}
              maxLength={200}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : isEditing ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;