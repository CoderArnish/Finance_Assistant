import { useState, useEffect, useCallback } from 'react';
import { transactionAPI } from '../services/api';

const EMPTY_FILTERS = {
  search:    '',
  category:  '',
  type:      '',
  startDate: '',
  endDate:   '',
};

/**
 * Custom hook that manages transaction fetching, server-side filters
 * (type, category, date range sent to the API) and client-side search
 * (description / category text match handled in the browser).
 */
export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [filters,      setFilters]      = useState(EMPTY_FILTERS);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Only pass server-side filters that the API understands
      const params = {};
      if (filters.category)  params.category  = filters.category;
      if (filters.type)      params.type      = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate)   params.endDate   = filters.endDate;

      const res = await transactionAPI.getAll(params);
      setTransactions(res.data);
    } catch {
      setError('Failed to load transactions. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Client-side full-text search across category + description
  const displayedTransactions = filters.search
    ? transactions.filter((t) => {
        const q = filters.search.toLowerCase();
        return (
          t.category?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
        );
      })
    : transactions;

  return {
    transactions:    displayedTransactions, // filtered for display
    allTransactions: transactions,           // unfiltered, for chart derivations
    loading,
    error,
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    refetch: fetchTransactions,
  };
};