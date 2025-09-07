// Test currency conversion in portfolioService
const EXCHANGE_RATES = {
  USD: { USD: 1, INR: 83.12, EUR: 0.85, GBP: 0.73 },
  INR: { USD: 0.012, INR: 1, EUR: 0.0102, GBP: 0.0088 },
  EUR: { USD: 1.18, INR: 98.35, EUR: 1, GBP: 0.86 },
  GBP: { USD: 1.37, INR: 113.89, EUR: 1.16, GBP: 1 }
};

function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;
  return EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
}

// Test conversions for dashboard values
console.log('Currency Conversion Test:');
console.log('=======================');

// USD to INR conversions (for US stocks on INR dashboard)
const usdToInrRate = getExchangeRate('USD', 'INR');
console.log(`USD to INR rate: ${usdToInrRate}`);

console.log('\nUS Stock Conversions (USD → INR):');
console.log(`NVDA $165.99 → ₹${(165.99 * usdToInrRate).toFixed(2)}`);
console.log(`MSFT $300.00 → ₹${(300 * usdToInrRate).toFixed(2)}`);
console.log(`NVDA Market Value $7,137.70 → ₹${(7137.70 * usdToInrRate).toFixed(2)}`);

console.log('\nIndian Stock (should stay same):');
console.log(`TCS ₹2,000.00 → ₹${(2000 * getExchangeRate('INR', 'INR')).toFixed(2)}`);

console.log('\nExpected Dashboard Display (all in INR):');
console.log('• TCS: ₹2,000.00 (price), ₹16,000.00 (market value)');
console.log(`• NVDA: ₹${(165.99 * usdToInrRate).toFixed(2)} (price), ₹${(7137.70 * usdToInrRate).toFixed(2)} (market value)`);
console.log(`• MSFT: ₹${(300 * usdToInrRate).toFixed(2)} (price), ₹${(2999.10 * usdToInrRate).toFixed(2)} (market value)`);
