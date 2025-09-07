// Test formatCurrency function behavior
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

console.log('🧪 Testing formatCurrency function\n');

console.log('Current formatCurrency behavior:');
console.log(`formatCurrency(16000, 'INR'): ${formatCurrency(16000, 'INR')}`);
console.log(`formatCurrency(16000, 'USD'): ${formatCurrency(16000, 'USD')}`);
console.log(`formatCurrency(2000, 'INR'): ${formatCurrency(2000, 'INR')}`);

console.log('\nExpected vs Current:');
console.log(`Expected: ₹16,000.00`);
console.log(`Current:  ${formatCurrency(16000, 'INR')}`);

// Test with proper locale for INR
function formatCurrencyFixed(amount, currency = 'USD') {
  const localeMap = {
    'USD': 'en-US',
    'INR': 'en-IN',
    'EUR': 'en-GB',
    'GBP': 'en-GB'
  };
  
  const locale = localeMap[currency] || 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

console.log('\nFixed formatCurrency behavior:');
console.log(`formatCurrencyFixed(16000, 'INR'): ${formatCurrencyFixed(16000, 'INR')}`);
console.log(`formatCurrencyFixed(16000, 'USD'): ${formatCurrencyFixed(16000, 'USD')}`);
console.log(`formatCurrencyFixed(2000, 'INR'): ${formatCurrencyFixed(2000, 'INR')}`);

// Test what happens with different locales
console.log('\nTesting different locales for INR:');
console.log(`en-US + INR: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(16000)}`);
console.log(`en-IN + INR: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(16000)}`);
console.log(`hi-IN + INR: ${new Intl.NumberFormat('hi-IN', { style: 'currency', currency: 'INR' }).format(16000)}`);
