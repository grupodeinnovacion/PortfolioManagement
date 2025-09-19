'use client';

import React, { useState } from 'react';
import { Portfolio } from '@/types/portfolio';
import { usePortfolios } from '@/hooks/usePortfolioData';
import { useQueryClient } from '@tanstack/react-query';

interface PortfolioManagerProps {
  onClose?: () => void;
}

interface CreatePortfolioForm {
  name: string;
  description: string;
  country: string;
  cashPosition: number;
  targetCashPercent: number;
}

const COUNTRY_OPTIONS = [
  { code: 'USA', name: 'United States', currency: 'USD' },
  { code: 'India', name: 'India', currency: 'INR' },
  { code: 'UK', name: 'United Kingdom', currency: 'GBP' },
  { code: 'Canada', name: 'Canada', currency: 'CAD' },
  { code: 'Germany', name: 'Germany', currency: 'EUR' },
  { code: 'Japan', name: 'Japan', currency: 'JPY' }
];

function PortfolioManager({ onClose }: PortfolioManagerProps) {
  const { data: portfolios = [], isLoading } = usePortfolios();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{portfolioId: string; transactionCount: number} | null>(null);
  const [forceDeleteId, setForceDeleteId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreatePortfolioForm>({
    name: '',
    description: '',
    country: 'USA',
    cashPosition: 0,
    targetCashPercent: 5
  });

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          country: createForm.country,
          cashPosition: createForm.cashPosition,
          targetCashPercent: createForm.targetCashPercent
        }),
      });

      if (response.ok) {
        // Reset form
        setCreateForm({
          name: '',
          description: '',
          country: 'USA',
          cashPosition: 0,
          targetCashPercent: 5
        });
        setShowCreateForm(false);

        // Refresh portfolios data
        queryClient.invalidateQueries({ queryKey: ['portfolios'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } else {
        const error = await response.json();
        alert(`Failed to create portfolio: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert('Failed to create portfolio');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePortfolio = async (portfolioId: string, force = false) => {
    setIsDeletingId(portfolioId);

    try {
      const url = force
        ? `/api/portfolios?portfolioId=${portfolioId}&force=true`
        : `/api/portfolios?portfolioId=${portfolioId}`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['portfolios'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        setDeleteConfirmId(null);
        setDeleteWarning(null);
        setForceDeleteId(null);

        if (result.deletedTransactions > 0) {
          alert(`Portfolio deleted along with ${result.deletedTransactions} transactions for audit purposes.`);
        }
      } else {
        const error = await response.json();
        if (error.requiresForce) {
          setDeleteWarning({
            portfolioId,
            transactionCount: error.transactionCount
          });
          setDeleteConfirmId(null);
        } else {
          alert(`Failed to delete portfolio: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Failed to delete portfolio');
    } finally {
      setIsDeletingId(null);
    }
  };

  const getCountryCurrency = (countryCode: string) => {
    return COUNTRY_OPTIONS.find(c => c.code === countryCode)?.currency || 'USD';
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Delete Warning Modal */}
      {deleteWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Warning: Portfolio Has Transactions
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                This portfolio contains <strong>{deleteWarning.transactionCount} transactions</strong>.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                <strong>⚠️ This action is irreversible!</strong> The portfolio and all its transactions will be marked as deleted but preserved for audit purposes.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The portfolio will disappear from all views but data will remain in the system for auditing.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDeletePortfolio(deleteWarning.portfolioId, true)}
                disabled={isDeletingId === deleteWarning.portfolioId}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {isDeletingId === deleteWarning.portfolioId ? 'Deleting...' : 'Force Delete'}
              </button>
              <button
                onClick={() => setDeleteWarning(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Portfolio Management
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

      {/* Existing Portfolios */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Existing Portfolios ({portfolios.length})
        </h4>
        <div className="space-y-3">
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">{portfolio.name}</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{portfolio.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {portfolio.country} • {portfolio.currency}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Cash: {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: portfolio.currency
                        }).format(portfolio.cashPosition || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deleteConfirmId === portfolio.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600 dark:text-red-400">Delete?</span>
                    <button
                      onClick={() => handleDeletePortfolio(portfolio.id)}
                      disabled={isDeletingId === portfolio.id}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeletingId === portfolio.id ? 'Deleting...' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(portfolio.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete portfolio"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create New Portfolio */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
        >
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Portfolio
          </div>
        </button>
      ) : (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Create New Portfolio</h4>
          <form onSubmit={handleCreatePortfolio} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Portfolio Name *
              </label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., US Growth Portfolio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Country *
                </label>
                <select
                  required
                  value={createForm.country}
                  onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Cash %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={createForm.targetCashPercent}
                  onChange={(e) => setCreateForm({ ...createForm, targetCashPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Initial Cash Position ({getCountryCurrency(createForm.country)})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createForm.cashPosition}
                onChange={(e) => setCreateForm({ ...createForm, cashPosition: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Portfolio'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </>
  );
}

export default PortfolioManager;