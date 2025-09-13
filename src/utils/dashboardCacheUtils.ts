async function refreshDashboardCache(currency = 'USD'): Promise<void> {
  try {
    console.log(`🔄 Refreshing dashboard cache for ${currency}...`);
    const response = await fetch('/api/dashboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currency }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh dashboard cache: ${response.statusText}`);
    }

    console.log(`✅ Dashboard cache refreshed for ${currency}`);
  } catch (error) {
    console.error('Error refreshing dashboard cache:', error);
  }
}

export async function refreshAllDashboardCaches(): Promise<void> {
  // Refresh cache for common currencies
  const currencies = ['USD', 'EUR', 'GBP', 'INR'];

  try {
    await Promise.all(currencies.map(currency => refreshDashboardCache(currency)));
    console.log('✅ All dashboard caches refreshed');
  } catch (error) {
    console.error('Error refreshing all dashboard caches:', error);
  }
}

export { refreshDashboardCache };