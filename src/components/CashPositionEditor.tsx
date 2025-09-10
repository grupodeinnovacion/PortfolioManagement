'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface CashPositionEditorProps {
  portfolioId: string;
  portfolioName: string;
  cashPosition: number;
  currency: string;
  onUpdate: () => void;
}

export default function CashPositionEditor({
  portfolioId,
  portfolioName,
  cashPosition,
  currency,
  onUpdate
}: CashPositionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(cashPosition.toString());
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const newValue = parseFloat(editValue);
      if (isNaN(newValue) || newValue < 0) {
        alert('Please enter a valid positive number');
        return;
      }

      await fetch('/api/sync-cash-positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioId,
          amount: newValue
        })
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update cash position:', error);
      alert('Failed to update cash position');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(cashPosition.toString());
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {portfolioName} - Cash Position
          </h3>
          {!isEditing ? (
            <div className="flex items-center mt-1">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(cashPosition, currency)}
              </span>
              <button
                onClick={() => setIsEditing(true)}
                className="ml-2 px-2 py-1 text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-gray-300 rounded"
                title="Edit cash position"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="flex items-center mt-1 space-x-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyPress}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
                disabled={isLoading}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currency}
              </span>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-2 py-1 text-xs text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors border border-green-300 rounded"
                title="Save"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors border border-red-300 rounded"
                title="Cancel"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
