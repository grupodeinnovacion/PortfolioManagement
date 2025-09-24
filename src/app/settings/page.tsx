'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Save, RefreshCw, Palette, Database, Key, Bell, FolderOpen } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { MultiCurrencyRateDisplay } from '@/components/CurrencyRateDisplay';

// Lazy load PortfolioManager as it's only used in the manage tab
const PortfolioManager = lazy(() => import('@/components/PortfolioManager'));

interface Settings {
  general: {
    baseCurrency: string;
    refreshInterval: number;
    timezone: string;
  };
  portfolios: {
    [key: string]: {
      targetCash: number;
      rebalanceThreshold: number;
    };
  };
  sheets: {
    spreadsheetId: string;
    transactionsSheet: string;
    settingsSheet: string;
    portfoliosSheet: string;
  };
  notifications: {
    emailAlerts: boolean;
    priceAlerts: boolean;
    rebalanceAlerts: boolean;
    transactionAlerts: boolean;
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<Settings>({
    general: {
      baseCurrency: 'USD',
      refreshInterval: 5,
      timezone: 'America/New_York'
    },
    portfolios: {},
    sheets: {
      spreadsheetId: '',
      transactionsSheet: 'Transactions',
      settingsSheet: 'Settings',
      portfoliosSheet: 'Portfolios'
    },
    notifications: {
      emailAlerts: true,
      priceAlerts: true,
      rebalanceAlerts: true,
      transactionAlerts: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const settingsData = await response.json();
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        console.log(`Settings saved successfully for ${section}`);
        // Show success message or toast here
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // Show error message or toast here
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: 'general', name: 'General', icon: Palette },
    { id: 'manage', name: 'Manage Portfolios', icon: FolderOpen },
    { id: 'portfolios', name: 'Portfolio Settings', icon: Database },
    { id: 'sheets', name: 'Google Sheets', icon: Key },
    { id: 'notifications', name: 'Notifications', icon: Bell }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your portfolio preferences and integrations
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'general' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    General Settings
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dashboard Base Currency
                    </label>
                    <select
                      value={settings.general.baseCurrency}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, baseCurrency: e.target.value }
                      })}
                      className="mt-1 block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      All portfolio values will be converted to this currency for the consolidated dashboard view.
                    </p>
                  </div>

                  {/* Currency Exchange Rates */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Current Exchange Rates
                      </h4>
                      <div className="text-sm text-gray-500">
                        Use the main &quot;Refresh All Data&quot; button to update rates
                      </div>
                    </div>
                    <MultiCurrencyRateDisplay 
                      baseCurrency={settings.general.baseCurrency}
                      targetCurrencies={['USD', 'INR', 'EUR', 'GBP']}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Data Refresh Interval (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.general.refreshInterval}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, refreshInterval: parseInt(e.target.value) }
                      })}
                      className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="1"
                      max="60"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('general')}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'manage' && (
              <Suspense fallback={
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              }>
                <PortfolioManager />
              </Suspense>
            )}

            {activeTab === 'portfolios' && (
              <div className="space-y-6">
                {Object.entries(settings.portfolios).map(([portfolioId, config]) => (
                  <div key={portfolioId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                        {portfolioId.replace('-', ' ')} Settings
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Target Cash (%)
                          </label>
                          <input
                            type="number"
                            value={config.targetCash}
                            onChange={(e) => setSettings({
                              ...settings,
                              portfolios: {
                                ...settings.portfolios,
                                [portfolioId]: { ...config, targetCash: parseInt(e.target.value) }
                              }
                            })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            min="0"
                            max="50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Rebalance Threshold (%)
                          </label>
                          <input
                            type="number"
                            value={config.rebalanceThreshold}
                            onChange={(e) => setSettings({
                              ...settings,
                              portfolios: {
                                ...settings.portfolios,
                                [portfolioId]: { ...config, rebalanceThreshold: parseInt(e.target.value) }
                              }
                            })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            min="1"
                            max="20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4">
                  <button
                    onClick={() => handleSave('portfolios')}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Portfolio Settings'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'sheets' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Google Sheets Integration
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Spreadsheet ID
                    </label>
                    <input
                      type="text"
                      value={settings.sheets.spreadsheetId}
                      onChange={(e) => setSettings({
                        ...settings,
                        sheets: { ...settings.sheets, spreadsheetId: e.target.value }
                      })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      The ID from your Google Sheets URL
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Transactions Sheet
                      </label>
                      <input
                        type="text"
                        value={settings.sheets.transactionsSheet}
                        onChange={(e) => setSettings({
                          ...settings,
                          sheets: { ...settings.sheets, transactionsSheet: e.target.value }
                        })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Settings Sheet
                      </label>
                      <input
                        type="text"
                        value={settings.sheets.settingsSheet}
                        onChange={(e) => setSettings({
                          ...settings,
                          sheets: { ...settings.sheets, settingsSheet: e.target.value }
                        })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Portfolios Sheet
                      </label>
                      <input
                        type="text"
                        value={settings.sheets.portfoliosSheet}
                        onChange={(e) => setSettings({
                          ...settings,
                          sheets: { ...settings.sheets, portfoliosSheet: e.target.value }
                        })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Key className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Google Sheets Setup Required
                        </h3>
                        <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                          <p>You&apos;ll need to set up Google Sheets API access with service account credentials.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('sheets')}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Integration Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notification Preferences
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  {Object.entries(settings.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, [key]: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('notifications')}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Notification Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
